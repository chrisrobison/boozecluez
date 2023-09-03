#!/usr/local/bin/php
<?php

$html = file_get_contents("bars.html");

$parts = preg_split("/busines\-directory\-card\-margin/", $html);

array_shift($parts);
$bars = array();
$barnames = array();

foreach ($parts as $part) {
    $bar = new stdClass();
    if (preg_match_all("/itemprop=\"name\"\starget=\"_blank\">([^<]*)<\/a/", $part, $matches)) {
        $bar->name = $matches[1][0];
        $barnames[] = $bar->name;
    }

    if (preg_match_all("/itemprop=\"(\w+)\">([^<]*)</", $part, $matches)) {
        $cnt = count($matches[1]);
        for ($i=0; $i<$cnt; $i++) {
            $bar->{$matches[1][$i]} = trim($matches[2][$i]);
        }
    }
    
    if (preg_match_all("/(lat|lng)=\"([^\"]*)\"/", $part, $matches)) {
        $cnt = count($matches[1]);
        for ($i=0; $i<$cnt; $i++) {
            $bar->{$matches[1][$i]} = $matches[2][$i];
        }
    }
    $bars[] = $bar;
}
//print_r($parts);
print json_encode($bars);

?>
