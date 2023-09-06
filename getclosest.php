<?php
/*
 *  getclosest.php  -   Gets closest San Francisco bars from a bar name or lat/long coordinates
 *
 *  Usage:
 *
 *  Make a http[s] request to this script with one of the following query argument:
 *
 *      bar -   (string) Name of bar to use as starting point
 *
 *          - or -
 *      lat -   (float) Latitude of start location
 *      lng -   (float) Longitude of start location
 *          
 *          - Optional -
 *      cnt -   (int) Number of bars to return (default: 6)
 *
 *  Note: only one of "bar" or "lat/lng" is needed.
 *
 *  Example: 
 *
 *  https://boozecluez.com/getclosest.php?bar=Zeitgeist&cnt=10
 *
 *  Returns:
 *
 *      JSON object containing the name and address of the starting point
 *      along with an array of the top 10 closest bars
 *
 */

$in = $_REQUEST;

$bars = json_decode(file_get_contents("bars.json"));
$cnt = count($bars);
$out = array();
$bybar = array();

if (array_key_exists("bar", $in)) {
    foreach ($bars as $idx=>$bar) {
        $bybar[$bars[$idx]->name] = $bars[$idx];
        if ($bar->name == $in['bar']) {
            $curbar = $bar;
            break;
        }
    }
    $in['lat'] = $curbar->lat;
    $in['lng'] = $curbar->lng;
    $bar = $curbar;
} else if (array_key_exists("lat", $in)) {
    $distances = array();

    foreach ($bars as $i=>$bar) {
        $bybar[$bars[$i]->name] = $bars[$i];
        $dist = distance($in['lat'], $in['lng'], $bar->lat, $bar->lng);
        $distances[$bar->name] = $dist;
    }
    asort($distances);
    $cbk = array_keys($distances);
    $cbv = array_values($distances);
    $bar = $curbar = $bybar[$cbk[0]];
}

$cnt = (array_key_exists("cnt", $in)) ? $in['cnt'] : 6;

   $used = array();
    
    $shortestDist = 6371000;
    $shortestBar = "";
    $shortests = array();
    $barcnt = count($bars);

    for ($i=0; $i<$barcnt; $i++) {

        if (($bar->name != $bars[$i]->name) && ($bar != $bars[$i])) {
            $dist = distance($in['lat'], $in['lng'], $bars[$i]->lat, $bars[$i]->lng);
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
    $nearest = array_splice($keys, 0, $cnt);
    $dists = array_splice($vals, 0, $cnt);

    $out[$bar->name]->name = $bar->name;
    $out[$bar->name]->address = $bar->address;
    
    $out[$bar->name]->bars = array_splice($keys, 0, $cnt);
    $out[$bar->name]->distances = array_splice($vals, 0, $cnt);
    
    $out[$bar->name]->closestBars = [];

    foreach ($nearest as $idx=>$key) {
        $obj = new stdClass();
        $obj->distance = $dists[$idx];
        $obj->name = $key;
        $obj->address = $bybar[$key]->address;

        $out[$bar->name]->closestBars[] = $obj;;
    }

//print "'" . $bar->name . "' closest bar: '" . $shortestBar->name . "' [".round($shortestFeet / 3)."yd]\n";
print json_encode($out[$bar->name]);

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
