#!/usr/local/bin/php
<?php

    $barstxt = file_get_contents("bars.json");
    $bars = json_decode($barstxt);

    $xtra = json_decode(file_get_contents("more-bars.json"));
    $newbars = array();
    $broken = array();

    foreach ($xtra as $new) {
        $newbar = preg_replace("/The (.*)/", "$1, The", preg_replace("/\&amp;/", '&', $new->bar));
        
        $found = 0;

        foreach ($bars as $bar) {
            if ($bar->name == $newbar) {
                $found = 1;
                break;
            }
        }

        if (!$found) {
            print "Missing bar:  $newbar [{$new->address}]\n";
            $a = urlencode($new->address);
            $geotxt = file_get_contents("https://dharristours.simpsf.com/portal/geocode.php?addr={$a}");
            if ($geotxt) {
                $geo = json_decode($geotxt);
                
                if ($geo->features && count($geo->features)) {
                    $lat = $geo->features[0]->geometry->coordinates[1];
                    $lng = $geo->features[0]->geometry->coordinates[0];
                
                    $aparts = preg_split("/\s/", $new->address);
                    $zip = array_pop($aparts);
                    $newaddr = preg_replace("/, San Fran.*/", "", $new->address);

                    $newobj = new stdClass();
                    $newobj->name = $newbar;
                    $newobj->address = $newaddr;
                    $newobj->city = "San Francisco";
                    $newobj->state = "CA";
                    $newobj->zip = $zip;
                    $newobj->lat = $lat;
                    $newobj->lng = $lng;
                    
                    $newbars[] = $newobj;
                    $bars[] = $newobj;
                } else {
                    $broken[] = $new;
                }
            }
            
       }

    }

    $newlist = json_encode($bars, JSON_PRETTY_PRINT);

    file_put_contents("newbars.json", $newlist);
    file_put_contents("broken.json", json_encode($broken, JSON_PRETTY_PRINT));

    print $newlist;
    print_r($broken);
?>
