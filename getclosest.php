#!/usr/local/bin/php
<?php

    $barstxt = file_get_contents("bars.json");
    $bars = json_decode($barstxt);
    $cnt = count($bars);
    $out = array();
    $used = array();
    
    // Iterate over each bar and then compare distances to all other bars
    // to find the shortest distance
    foreach ($bars as $idx=>$bar) {
        $shortestDist = 6371000;
        $shortestBar = "";
        $bar->name = preg_replace("/&amp;/", "&", $bar->name);
        $shortests = array();

        for ($i=0; $i<$cnt; $i++) {
            if (($bar->name != $bars[$i]->name) && ($bar != $bars[$i])) {
                $dist = distance($bar->lat, $bar->lng, $bars[$i]->lat, $bars[$i]->lng);
                $ftdist = $dist * 3.28084;
                $shortests[$bars[$i]->name] = round($ftdist);

                if ($dist < $shortestDist) { // ) && (!array_key_exists($bars[$i]->name, $used))) {
                    if (($dist > 0) && ($idx != $i)) {
                        $shortestDist = $dist;
                        $shortestBar = $bars[$i];
                        $shortestBarName = $bars[$i]->name;
                        $shortestFeet = $ftdist;
                    }
                }
            }
        }
        $out[$bar->name] = new stdClass();
        asort($shortests);
        $keys = array_keys($shortests);
        $vals = array_values($shortests);
        $nearest = array_splice($keys, 0, 6);
    
        $out[$bar->name]->closestBars = array_splice($keys, 0, 6);
        $out[$bar->name]->distances = array_splice($vals, 0, 6);

        $used[$bar->name] = 1;
//        $used[$shortestBarName] = 1;
        $out[$bar->name]->closestBar = $shortestBar;
        $out[$bar->name]->distance = $shortestDist;
        $out[$bar->name]->name = $bar->name;
//print "'" . $bar->name . "' closest bar: '" . $shortestBar->name . "' [".round($shortestFeet / 3)."yd]\n";
    }
    print json_encode($out);

    function distance( $latitudeFrom, $longitudeFrom, $latitudeTo, $longitudeTo, $earthRadius = 6371000) {
  // convert from degrees to radians
  $latFrom = deg2rad($latitudeFrom);
  $lonFrom = deg2rad($longitudeFrom);
  $latTo = deg2rad($latitudeTo);
  $lonTo = deg2rad($longitudeTo);

  $latDelta = $latTo - $latFrom;
  $lonDelta = $lonTo - $lonFrom;

  $angle = 2 * asin(sqrt(pow(sin($latDelta / 2), 2) +
    cos($latFrom) * cos($latTo) * pow(sin($lonDelta / 2), 2)));
  return $angle * $earthRadius;
}
?>
