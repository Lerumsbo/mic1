<?php
header('Content-Type: application/json');

// Allow a "dir" query parameter, default to "tracks"
$dirParam = isset($_GET['dir']) ? $_GET['dir'] : 'tracks';

// Whitelist allowed directories to prevent abuse
$allowedDirs = ['tracks', 'tracks2', 'tracks3'];
if (!in_array($dirParam, $allowedDirs)) {
    http_response_code(400);
    echo json_encode(["error" => "Invalid directory"]);
    exit;
}

$dir = __DIR__ . '/' . $dirParam;
if (!is_dir($dir)) {
    http_response_code(404);
    echo json_encode(["error" => "Directory not found"]);
    exit;
}

// List only .json files
$files = glob($dir . '/*.json');
$filenames = array_map('basename', $files);

echo json_encode($filenames);
?>
