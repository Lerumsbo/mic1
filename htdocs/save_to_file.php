<?php
// Inkludera filens sökväg
$tracksDir = 'tracks/';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $data = json_decode(file_get_contents('php://input'), true);

    if (!isset($data['filename']) || !isset($data['tracks'])) {
        echo json_encode(['success' => false, 'message' => 'Missing filename or track data']);
        exit;
    }

    $filePath = $tracksDir . $data['filename'];

    // Läs in den befintliga filen om den finns, annars skapa en ny
    if (file_exists($filePath)) {
        $existingData = json_decode(file_get_contents($filePath), true);
        if (!isset($existingData['tracks'])) {
            $existingData['tracks'] = [];
        }
        // Lägg till alla låtar från den nya listan
        $existingData['tracks'] = array_merge($existingData['tracks'], $data['tracks']);
    } else {
        // Om filen inte finns, skapa en ny med alla låtar från tracklist
        $existingData = ['tracks' => $data['tracks']];
    }

    // Spara tillbaka alla låtar till filen
    if (file_put_contents($filePath, json_encode($existingData, JSON_PRETTY_PRINT))) {
        echo json_encode(['success' => true]);
    } else {
        echo json_encode(['success' => false, 'message' => 'Failed to save file']);
    }
} else {
    echo json_encode(['success' => false, 'message' => 'Invalid request method']);
}
?>
