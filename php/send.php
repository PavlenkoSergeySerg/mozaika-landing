<?php
/**
 * Приём заявки с формы:
 * 1) серверная валидация;
 * 2) сохранение фото в uploads/;
 * 3) отправка письма на 52almz52@mail.ru через mail();
 * 4) ответ в JSON для AJAX.
 * Паролей в коде НЕТ — отправляем от имени домена am-52.ru.
 */

// ---------- НАСТРОЙКИ ----------
$TO_EMAIL     = '52almz52@mail.ru';   // внутренняя почта для приёма заказов
$FROM_EMAIL   = 'zakaz@am-52.ru';     // отправитель — ваш домен (меньше спама)
$FROM_NAME    = 'AM-52.ru';
$SITE_URL     = 'https://am-52.ru';    // после включения SSL замените на https://
$MAX_SIZE     = 20 * 1024 * 1024;     // 20 МБ
$ALLOWED_EXT  = ['jpg', 'jpeg', 'png', 'webp'];

header('Content-Type: application/json; charset=utf-8');

// Принимаем только POST
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Неверный метод запроса']);
    exit;
}

// ---------- HONEYPOT: боты отсекаются молча ----------
if (trim($_POST['website'] ?? '') !== '') {
    echo json_encode(['success' => true, 'message' => 'Заявка отправлена! Мы свяжемся с вами в ближайшее время.']);
    exit;
}

// ---------- СЕРВЕРНАЯ ВАЛИДАЦИЯ ----------
$errors = [];

$name = trim($_POST['name'] ?? '');
if (mb_strlen($name) < 2) $errors[] = 'имя';

$phone = trim($_POST['phone'] ?? '');
$digits = preg_replace('/\D/', '', $phone);
if (strlen($digits) < 10 || strlen($digits) > 11) $errors[] = 'телефон';

$size = trim($_POST['size'] ?? '');
if ($size === '') $errors[] = 'размер';

$email = trim($_POST['email'] ?? '');
if ($email !== '' && !filter_var($email, FILTER_VALIDATE_EMAIL)) $errors[] = 'email';

$comment = trim($_POST['comment'] ?? '');

// Фото: обязательно, только картинки, до 20 МБ
if (!isset($_FILES['photo']) || $_FILES['photo']['error'] !== UPLOAD_ERR_OK) {
    $errors[] = 'фото';
    $file = null;
} else {
    $file = $_FILES['photo'];
    $ext = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
    if (!in_array($ext, $ALLOWED_EXT, true)) {
        $errors[] = 'формат фото (нужен JPG/PNG/WEBP)';
    } elseif ($file['size'] > $MAX_SIZE) {
        $errors[] = 'фото больше 20 МБ';
    } elseif (!@getimagesize($file['tmp_name'])) {
        $errors[] = 'файл не является изображением';
    } else {
        // Дополнительная проверка реального MIME-типа (защита от полиглот-файлов)
        $finfo = finfo_open(FILEINFO_MIME_TYPE);
        $realMime = finfo_file($finfo, $file['tmp_name']);
        finfo_close($finfo);
        $allowedMime = ['image/jpeg', 'image/png', 'image/webp'];
        if (!in_array($realMime, $allowedMime, true)) {
            $errors[] = 'реальный тип файла не соответствует изображению';
        }
    }
}

if ($errors) {
    http_response_code(422);
    echo json_encode([
        'success' => false,
        'message' => 'Проверьте поля: ' . implode(', ', $errors)
    ]);
    exit;
}

// ---------- RATE-LIMIT: не более 1 заявки в 60 секунд с IP ----------
$ip = $_SERVER['REMOTE_ADDR'] ?? 'unknown';
$rlFile = sys_get_temp_dir() . '/rl_am52_' . md5($ip);
if (file_exists($rlFile) && (time() - filemtime($rlFile)) < 60) {
    http_response_code(429);
    echo json_encode(['success' => false, 'message' => 'Слишком много заявок. Попробуйте через минуту.']);
    exit;
}
touch($rlFile);

// ---------- СОХРАНЕНИЕ ФОТО ----------
$uploadDir = __DIR__ . '/../uploads/';
if (!is_dir($uploadDir)) {
    mkdir($uploadDir, 0755, true);
}
// Защита деплоится с кодом, но страховка остаётся:
$ht = $uploadDir . '.htaccess';
if (!file_exists($ht)) {
    file_put_contents($ht,
        "Options -Indexes\n" .
        "<FilesMatch \"\\.(php|phtml|php5|php7|phar)$\">\nRequire all denied\n</FilesMatch>\n" .
        "Header set X-Content-Type-Options \"nosniff\"\n"
    );
}

// Уникальное имя: дата + случайный код (никаких имён от клиента!)
$newName = 'photo-' . date('Ymd-His') . '-' . bin2hex(random_bytes(8)) . '.' . $ext;

if (!move_uploaded_file($file['tmp_name'], $uploadDir . $newName)) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Не удалось сохранить фото. Попробуйте ещё раз.']);
    exit;
}
$photoUrl = $SITE_URL . '/uploads/' . $newName;

// ---------- ОТПРАВКА ПИСЬМА ----------
$subject = '=?UTF-8?B?' . base64_encode('Заявка am-52.ru: ' . $name) . '?=';

$body = "НОВАЯ ЗАЯВКА С САЙТА am-52.ru\n"
      . "--------------------------------\n"
      . "Имя:     $name\n"
      . "Телефон: $phone\n"
      . ($email !== ''   ? "Email:   $email\n" : '')
      . "Размер:  $size\n"
      . ($comment !== '' ? "Комментарий: $comment\n" : '')
      . "ФОТО:    $photoUrl\n"
      . "--------------------------------\n"
      . "Письмо отправлено автоматически.";

$replyTo = ($email !== '' && filter_var($email, FILTER_VALIDATE_EMAIL)) ? $email : $FROM_EMAIL;
$headers = "From: $FROM_NAME <$FROM_EMAIL>\r\n"
         . "Reply-To: $replyTo\r\n"
         . "Content-Type: text/plain; charset=utf-8\r\n";

if (!mail($TO_EMAIL, $subject, $body, $headers)) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Не удалось отправить заявку. Позвоните нам, пожалуйста: +7 (930) 284-61-71']);
    exit;
}

// ---------- ЛОГ ЗАЯВКИ (вне webroot, для анализа спама/абьюза) ----------
$logDir = __DIR__ . '/../../logs/';   // на сервере: ~/www/logs/ — вне корня сайта
if (!is_dir($logDir)) {
    mkdir($logDir, 0755, true);
}
// Защита от "log forging": убираем переводы строк из пользовательских полей
$clean = fn($s) => str_replace(["\r", "\n"], ' ', $s);
$logEntry = sprintf(
    "[%s] IP=%s | name=%s | phone=%s | email=%s | size=%s | file=%s\n",
    date('c'),
    $_SERVER['REMOTE_ADDR'] ?? '-',
    $clean($name),
    $clean($phone),
    $clean($email !== '' ? $email : '-'),
    $clean($size),
    $newName
);
file_put_contents($logDir . 'orders.log', $logEntry, FILE_APPEND | LOCK_EX);

echo json_encode(['success' => true, 'message' => 'Заявка отправлена! Мы свяжемся с вами в ближайшее время.']);
