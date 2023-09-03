#!/usr/local/bin/php
<?php
    $ct = file_get_contents("closest.json");
    $nexts = json_decode($ct);

    $out = array();

    foreach ($nexts as $bar=>$next) {
        $next->name = $bar;
        $out[$bar] = $next; 
    }
    print json_encode($out);

?>
