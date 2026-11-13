<?php
declare(strict_types=1);

/* =====================================================
   AVplus e.U. – Kontaktformular-Empfänger
   Nimmt die Anfragen der Webseite entgegen und schickt sie
   per E-Mail an office@avplus.at (über den eigenen Hoster,
   ohne Fremddienst).

   Versand:
   1. Standard: PHP mail() mit Absender office@avplus.at.
   2. Falls der Hoster mail() nicht zulässt: Datei
      kontakt-config.php neben diesem Skript anlegen (nicht im
      Repository, nur per SFTP). Dann wird über SMTP mit
      Anmeldung gesendet. Beispiel siehe unten.

   Schutz: verstecktes Feld (Honeypot), Mindestzeit auf der
   Seite, Begrenzung pro Besucher, Prüfung aller Eingaben.
   Es werden keine IP-Adressen im Klartext gespeichert.

   Beispiel kontakt-config.php:
     <?php
     return [
       'host'   => 'smtp.ionos.de',
       'port'   => 465,
       'secure' => 'ssl',            // 'ssl' (Port 465) oder 'tls' (Port 587)
       'user'   => 'office@avplus.at',
       'pass'   => '…',
       // 'dry_run_file' => '/pfad/test.txt',  // nur zum Testen: statt senden in Datei schreiben
     ];
   ===================================================== */

const MAIL_TO = 'office@avplus.at';
const MAIL_FROM = 'office@avplus.at';
const MAIL_FROM_NAME = 'AVplus Webseite';
const MAX_PER_HOUR = 6;
const MIN_FILL_MS = 3000;

$wantsJson = isset($_SERVER['HTTP_ACCEPT']) && str_contains((string) $_SERVER['HTTP_ACCEPT'], 'application/json');

function respond(int $status, bool $ok, string $message, bool $json): never
{
    http_response_code($status);
    header('Cache-Control: no-store');
    if ($json) {
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode(['ok' => $ok, 'message' => $message], JSON_UNESCAPED_UNICODE);
    } else {
        header('Content-Type: text/html; charset=utf-8');
        $text = htmlspecialchars($message, ENT_QUOTES, 'UTF-8');
        echo '<!DOCTYPE html><html lang="de"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1">'
            . '<meta name="robots" content="noindex"><title>Anfrage – AVplus e.U.</title></head>'
            . '<body style="font-family:Segoe UI,Arial,sans-serif;max-width:560px;margin:4rem auto;padding:0 1.2rem;line-height:1.6">'
            . '<h1 style="font-size:1.4rem">' . ($ok ? 'Danke für Ihre Anfrage' : 'Das hat leider nicht geklappt') . '</h1>'
            . '<p>' . $text . '</p><p><a href="/">Zurück zur Startseite</a></p></body></html>';
    }
    exit;
}

/* Eingabe bereinigen: Steuerzeichen raus, Länge begrenzen */
function clean(mixed $value, int $max, bool $multiline = false): string
{
    if (!is_string($value)) {
        return '';
    }
    $value = trim($value);
    $value = $multiline
        ? (string) preg_replace('/[^\P{C}\n]+/u', '', str_replace("\r\n", "\n", $value))
        : (string) preg_replace('/\p{C}+/u', ' ', $value);
    return mb_substr($value, 0, $max);
}

/* Kopfzeilen-Werte dürfen nie Zeilenumbrüche enthalten */
function headerSafe(string $value): string
{
    return trim((string) preg_replace('/[\r\n]+/', ' ', $value));
}

function encodeHeader(string $value): string
{
    return '=?UTF-8?B?' . base64_encode($value) . '?=';
}

/* ── Nur POST ── */
if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    header('Allow: POST');
    respond(405, false, 'Bitte nutzen Sie das Formular auf der Webseite.', $wantsJson);
}

/* ── Herkunft prüfen (wenn der Browser sie mitschickt) ── */
$origin = $_SERVER['HTTP_ORIGIN'] ?? ($_SERVER['HTTP_REFERER'] ?? '');
if ($origin !== '') {
    $host = (string) parse_url($origin, PHP_URL_HOST);
    $allowed = $host === 'avplus.at' || str_ends_with($host, '.avplus.at')
        || $host === 'localhost' || $host === '127.0.0.1';
    if (!$allowed) {
        respond(403, false, 'Anfrage nicht zulässig.', $wantsJson);
    }
}

/* ── Spam-Schutz: Honeypot und Mindestzeit (Bots werden still "bedankt") ── */
$elapsed = isset($_POST['_elapsed']) && is_numeric($_POST['_elapsed']) ? (int) $_POST['_elapsed'] : null;
if (clean($_POST['_gotcha'] ?? '', 200) !== '' || ($elapsed !== null && $elapsed < MIN_FILL_MS)) {
    respond(200, true, 'Danke, Ihre Anfrage ist eingegangen.', $wantsJson);
}

/* ── Eingaben prüfen ── */
$name = clean($_POST['name'] ?? '', 120);
if ($name === '') {
    $name = trim(clean($_POST['vorname'] ?? '', 60) . ' ' . clean($_POST['nachname'] ?? '', 60));
}
$email = clean($_POST['email'] ?? '', 200);
$telefon = clean($_POST['telefon'] ?? '', 40);
$nachricht = clean($_POST['nachricht'] ?? '', 5000, true);
$bereich = clean($_POST['bereich'] ?? '', 80);

if ($name === '') {
    respond(422, false, 'Bitte geben Sie Ihren Namen an.', $wantsJson);
}
$emailOk = $email !== '' && filter_var($email, FILTER_VALIDATE_EMAIL) !== false;
$telefonOk = $telefon !== '' && preg_match('/^[0-9 +\-()\/.]{5,40}$/', $telefon) === 1;
if ($email !== '' && !$emailOk) {
    respond(422, false, 'Die E-Mail-Adresse scheint nicht zu stimmen.', $wantsJson);
}
if ($telefon !== '' && !$telefonOk) {
    respond(422, false, 'Die Telefonnummer scheint nicht zu stimmen.', $wantsJson);
}
if (!$emailOk && !$telefonOk) {
    respond(422, false, 'Bitte geben Sie eine Telefonnummer oder eine E-Mail-Adresse an.', $wantsJson);
}

/* ── Begrenzung pro Besucher (nur ein Hash der IP, in der temporären Ablage) ── */
$key = hash('sha256', ($_SERVER['REMOTE_ADDR'] ?? 'x') . '|' . __DIR__);
$rateFile = sys_get_temp_dir() . '/avplus_kontakt_' . substr($key, 0, 32) . '.json';
$now = time();
$hits = [];
if (is_file($rateFile)) {
    $decoded = json_decode((string) @file_get_contents($rateFile), true);
    if (is_array($decoded)) {
        $hits = array_values(array_filter($decoded, static fn($t) => is_int($t) && $t > $now - 3600));
    }
}
if (count($hits) >= MAX_PER_HOUR) {
    respond(429, false, 'Zu viele Anfragen. Bitte rufen Sie uns an: +43 676 6520263.', $wantsJson);
}

/* ── Spam-Verdacht: Die Anfrage wird trotzdem zugestellt, nur im Betreff markiert.
      So geht keine echte Anfrage verloren. ── */
$verdacht = [];
if ($elapsed === null) {
    $verdacht[] = 'Zeitfeld fehlt (ohne JavaScript gesendet)';
}
$botTexte = [
    '/Ich wünsche weitere Informationen\.\s*Bitte kontaktieren Sie mich per E-Mail/iu',
    '/hear more about company news/i',
    '/send me news and updates/i',
    '/medientechnik\s*&\s*smart home wien/iu',
];
foreach ($botTexte as $muster) {
    if (preg_match($muster, $nachricht) === 1) {
        $verdacht[] = 'bekannter Bot-Text';
        break;
    }
}

/* ── E-Mail zusammenstellen ── */
$referer = (string) parse_url($_SERVER['HTTP_REFERER'] ?? '', PHP_URL_PATH);
$zeit = (new DateTimeImmutable('now', new DateTimeZone('Europe/Vienna')))->format('d.m.Y H:i');
$subject = ($verdacht !== [] ? '[Spam-Verdacht] ' : '')
    . 'Neue Anfrage über avplus.at' . ($bereich !== '' ? ' – ' . headerSafe($bereich) : '');
$body = ($verdacht !== [] ? 'Spam-Verdacht: ' . implode(', ', $verdacht) . "\n\n" : '')
    . "Neue Anfrage über die Webseite\n"
    . "------------------------------\n"
    . 'Bereich:  ' . ($bereich !== '' ? $bereich : '-') . "\n"
    . 'Name:     ' . $name . "\n"
    . 'Telefon:  ' . ($telefon !== '' ? $telefon : '-') . "\n"
    . 'E-Mail:   ' . ($email !== '' ? $email : '-') . "\n"
    . 'Seite:    ' . ($referer !== '' ? $referer : '-') . "\n"
    . 'Zeit:     ' . $zeit . "\n\n"
    . "Nachricht:\n" . ($nachricht !== '' ? $nachricht : '-') . "\n";

$headers = [
    'From: ' . encodeHeader(MAIL_FROM_NAME) . ' <' . MAIL_FROM . '>',
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset=UTF-8',
    'Content-Transfer-Encoding: 8bit',
    'X-Mailer: avplus-kontakt',
];
if ($emailOk) {
    $headers[] = 'Reply-To: ' . headerSafe($email);
}
$encodedSubject = encodeHeader($subject);

/* ── Versand ── */
function smtpSend(array $c, string $to, string $encodedSubject, string $body, array $headers): bool
{
    $secure = $c['secure'] ?? 'ssl';
    $target = ($secure === 'ssl' ? 'ssl://' : '') . $c['host'] . ':' . (int) $c['port'];
    $fp = @stream_socket_client($target, $errno, $errstr, 10);
    if (!$fp) {
        return false;
    }
    stream_set_timeout($fp, 10);
    $read = static function () use ($fp): string {
        $reply = '';
        while (($line = fgets($fp, 515)) !== false) {
            $reply .= $line;
            if (strlen($line) < 4 || $line[3] === ' ') {
                break;
            }
        }
        return $reply;
    };
    $cmd = static function (string $line, string $expect) use ($fp, $read): bool {
        fwrite($fp, $line . "\r\n");
        return str_starts_with($read(), $expect);
    };
    $ok = str_starts_with($read(), '220')
        && $cmd('EHLO avplus.at', '250');
    if ($ok && $secure === 'tls') {
        $ok = $cmd('STARTTLS', '220')
            && @stream_socket_enable_crypto($fp, true, STREAM_CRYPTO_METHOD_TLS_CLIENT)
            && $cmd('EHLO avplus.at', '250');
    }
    $ok = $ok
        && $cmd('AUTH LOGIN', '334')
        && $cmd(base64_encode((string) $c['user']), '334')
        && $cmd(base64_encode((string) $c['pass']), '235')
        && $cmd('MAIL FROM:<' . MAIL_FROM . '>', '250')
        && $cmd('RCPT TO:<' . $to . '>', '250')
        && $cmd('DATA', '354');
    if ($ok) {
        $message = implode("\r\n", $headers)
            . "\r\nTo: " . $to
            . "\r\nSubject: " . $encodedSubject
            . "\r\nDate: " . date('r')
            . "\r\n\r\n" . str_replace("\n", "\r\n", $body);
        $message = (string) preg_replace('/^\./m', '..', $message);
        $ok = $cmd($message . "\r\n.", '250');
    }
    @fwrite($fp, "QUIT\r\n");
    fclose($fp);
    return $ok;
}

/* Ausgabe der Konfigurationsdatei (z. B. unsichtbares Zeichen am Dateianfang) verwerfen,
   damit sie die Antwort an das Formular nicht stören kann */
ob_start();
$config = is_file(__DIR__ . '/kontakt-config.php') ? include __DIR__ . '/kontakt-config.php' : null;
ob_end_clean();
$sent = false;
if (is_array($config) && !empty($config['dry_run_file'])) {
    $sent = @file_put_contents((string) $config['dry_run_file'], implode("\n", $headers) . "\nSubject: " . $subject . "\n\n" . $body . "\n=====\n", FILE_APPEND) !== false;
} elseif (is_array($config) && !empty($config['host']) && !empty($config['user'])) {
    $sent = smtpSend($config, MAIL_TO, $encodedSubject, $body, $headers);
} else {
    /* Absender der Mail ist office@avplus.at (Header "From"). Zusätzlich wird versucht, auch den
       technischen Absender (Envelope-From) auf diese Adresse zu setzen. Erlaubt der Hoster das nicht,
       wird ohne diese Angabe gesendet, damit keine Anfrage verloren geht. */
    $sent = @mail(MAIL_TO, $encodedSubject, $body, implode("\r\n", $headers), '-f' . MAIL_FROM);
    if (!$sent) {
        $sent = @mail(MAIL_TO, $encodedSubject, $body, implode("\r\n", $headers));
    }
}

if (!$sent) {
    error_log('avplus-kontakt: Versand fehlgeschlagen');
    respond(500, false, 'Das Senden hat leider nicht geklappt. Bitte rufen Sie uns an: +43 676 6520263 oder schreiben Sie an office@avplus.at.', $wantsJson);
}

/* Erfolg: Zähler für die Begrenzung speichern, alte Dateien gelegentlich löschen */
$hits[] = $now;
@file_put_contents($rateFile, json_encode($hits), LOCK_EX);
if (random_int(1, 50) === 1) {
    foreach (glob(sys_get_temp_dir() . '/avplus_kontakt_*.json') ?: [] as $old) {
        if (@filemtime($old) < $now - 86400) {
            @unlink($old);
        }
    }
}

respond(200, true, 'Danke, Ihre Anfrage ist eingegangen. Wir melden uns innerhalb von 24 Stunden.', $wantsJson);
