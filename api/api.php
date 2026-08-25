<?php

declare(strict_types=1);

$config = require __DIR__ . '/config.php';

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Headers: Content-Type');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

try {
    $database = new PDO($config['dsn'], $config['username'], $config['password'], [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    ]);
} catch (Throwable $error) {
    respond(['error' => 'Database connection failed.'], 500);
}

$resource = $_GET['resource'] ?? '';
$method = $_SERVER['REQUEST_METHOD'];
$payload = json_decode(file_get_contents('php://input'), true) ?: [];

if ($method === 'GET' && $resource === 'students') {
    respond($database->query('SELECT * FROM students ORDER BY name')->fetchAll());
}

if ($method === 'GET' && $resource === 'grades') {
    respond($database->query('SELECT * FROM grades ORDER BY created_at DESC')->fetchAll());
}

if ($method === 'POST' && $resource === 'grades') {
    $statement = $database->prepare(
        'INSERT INTO grades (grade_id, student_uid, student_name, grade_level, section, strand, quiz, score, total, percentage, type, completed_at)
         VALUES (:grade_id, :student_uid, :student_name, :grade_level, :section, :strand, :quiz, :score, :total, :percentage, :type, :completed_at)',
    );
    $statement->execute([
        'grade_id' => $payload['gradeId'], 'student_uid' => $payload['studentUid'],
        'student_name' => $payload['studentName'], 'grade_level' => $payload['gradeLevel'],
        'section' => $payload['section'], 'strand' => $payload['strand'] ?? '',
        'quiz' => $payload['quiz'] ?? '', 'score' => $payload['score'], 'total' => $payload['total'],
        'percentage' => $payload['percentage'], 'type' => $payload['type'],
        'completed_at' => date('Y-m-d H:i:s', strtotime((string) ($payload['date'] ?? 'now'))),
    ]);
    respond(['ok' => true], 201);
}

if ($method === 'POST' && $resource === 'login') {
    $identity = strtolower(trim((string) ($payload['identity'] ?? '')));
    $statement = $database->prepare(
        'SELECT * FROM students WHERE LOWER(name) = :identity OR LOWER(uid) = :identity LIMIT 1',
    );
    $statement->execute(['identity' => $identity]);
    $student = $statement->fetch();
    if (!$student || !$student['registered'] || !password_verify((string) ($payload['password'] ?? ''), $student['password_hash'])) {
        respond(['error' => 'Invalid student credentials.'], 401);
    }
    respond(['role' => 'student', 'name' => $student['name'], 'uid' => $student['uid']]);
}

if ($method === 'POST' && $resource === 'students') {
    $required = ['name', 'uid', 'birthdate', 'gender', 'grade', 'section', 'phone', 'email'];
    foreach ($required as $field) {
        if (!isset($payload[$field]) || trim((string) $payload[$field]) === '') {
            respond(['error' => "Missing field: {$field}"], 422);
        }
    }
    $statement = $database->prepare(
        'INSERT INTO students (name, uid, birthdate, age, gender, grade, strand, section, phone, email, picture, active, status, registered)
         VALUES (:name, :uid, :birthdate, :age, :gender, :grade, :strand, :section, :phone, :email, :picture, :active, :status, 0)',
    );
    $statement->execute([
        'name' => $payload['name'], 'uid' => $payload['uid'], 'birthdate' => $payload['birthdate'],
        'age' => $payload['age'] ?? null, 'gender' => $payload['gender'], 'grade' => $payload['grade'],
        'strand' => $payload['strand'] ?? '', 'section' => $payload['section'], 'phone' => $payload['phone'],
        'email' => $payload['email'], 'picture' => $payload['picture'] ?? '', 'active' => 1, 'status' => 'Active',
    ]);
    respond(['ok' => true, 'uid' => $payload['uid']], 201);
}

if ($method === 'POST' && $resource === 'register') {
    $statement = $database->prepare('SELECT * FROM students WHERE LOWER(name) = :identity OR LOWER(uid) = :identity LIMIT 1');
    $statement->execute(['identity' => strtolower(trim((string) ($payload['identity'] ?? '')))]);
    $student = $statement->fetch();
    $answer = strtolower(trim((string) ($payload['answer'] ?? '')));
    $expected = strtolower($student ? "{$student['grade']} - {$student['section']}" : '');
    if (!$student || $student['registered'] || !in_array($answer, [$expected, str_replace(' - ', ' ', $expected)], true)) {
        respond(['error' => 'Registration details could not be verified.'], 422);
    }
    $statement = $database->prepare('UPDATE students SET password_hash = :password_hash, security_answer = :answer, registered = 1 WHERE id = :id');
    $statement->execute(['password_hash' => password_hash((string) $payload['password'], PASSWORD_DEFAULT), 'answer' => $answer, 'id' => $student['id']]);
    respond(['ok' => true]);
}

respond(['error' => 'Unknown resource.'], 404);

function respond(array $body, int $status = 200): never
{
    http_response_code($status);
    echo json_encode($body, JSON_UNESCAPED_SLASHES);
    exit;
}