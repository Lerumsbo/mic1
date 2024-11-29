<?php
if (isset($_GET['filename'])) {
    $filename = basename($_GET['filename']);
    $filepath = "tracks/" . $filename;

    if (file_exists($filepath)) {
        // Läs in innehållet i filen
        $content = file_get_contents($filepath);

        // Försök att decodera JSON-innehållet
        $decodedContent = json_decode($content, true);

        if (json_last_error() === JSON_ERROR_NONE) {
            // Om dekodningen är framgångsrik, returnera innehållet
            echo json_encode([
                "success" => true,
                "tracks" => $decodedContent['tracks'] ?? []  // Säkerställ att "tracks" finns
            ]);
        } else {
            echo json_encode([
                "success" => false,
                "message" => "Fel vid avkodning av JSON."
            ]);
        }
    } else {
        echo json_encode([
            "success" => false,
            "message" => "Filen finns inte."
        ]);
    }
} else {
    echo json_encode([
        "success" => false,
        "message" => "Ingen fil angavs."
    ]);
}
?>
