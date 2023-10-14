<?php
    $in = $_REQUEST;

if (array_key_exists("name", $in) && array_key_exists("addr", $in)) {
        
        $txt = file_get_contents("missing.json");
        $json = json_decode($txt);
        $new = new stdClass();
        $new->Bar = $in['name'];
        $new->Address = $in['addr'];
        $new->SentBy = $in['by'];

        $json[] = $new;

        $out = json_encode($json);
        file_put_contents("missing.json", $out);

        header("Content-type: application/json");
        print '{"status": "ok"}';
        exit;
}
?>
