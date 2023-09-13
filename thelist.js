const $ = str => document.querySelector(str);
const $$ = str => document.querySelectorAll(str);

(function() {
    const app = {
        config: {
            maxBars: 5,
            hideVisited: 0,
            months: ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'],
            day_of_week: ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']
        },
        data: [],
        state: {
            seen: {},
            loaded: false,
            visited: {},
            markers: [],
            layers: [],
            markerClusterGroups: []
        },
        init: function() {
            app.showOverlay();

            // Load user data from localStorage
            let tmp = app.loadSettings('visits');
            if (tmp) app.state.visited = tmp;
            
            // Setup map
            app.map = L.map($("#map"), { center: [ 37.757113, -122.442943], zoom: 11 });
            L.tileLayer('https://{s}.tile.osm.org/{z}/{x}/{y}.png', { attribution: '' }).addTo(app.map);
            app.map.on("click", app.mapclick);

            app.fetch("bars.json", app.showBars);
            setTimeout(function() { app.hideOverlay(); }, 3000);
        },
        fetch: function(url, callback) {
            return fetch(url).then(response=>response.json()).then(data=>{
                app.data = data;
                app.state.loaded = true;
                if (callback && typeof(callback) === "function") {
                    callback(data);
                }
            });
        },
        mapclick: function(e) {
            console.log("mapclick");
            console.dir(e);
            let closest = app.findClosest(e.latlng[0], e.latlng[1]);
            app.doNext(closest.name);
        },
        saveSettings: function(key, obj) {
            if (key && obj) {
                localStorage.setItem(key, JSON.stringify(obj));
            }
        },
        loadSettings: function(key) {
            if (key) {
                return JSON.parse(localStorage.getItem(key));
            } 
        },
        loadNext: function(data) {
            app.next = data;
            app.fetch("clues.json", app.loadClues);
        },
        loadClues: function(data) {
            app.clues = data;
            app.fetch("bars.json", app.showBars);
        },
        doStart: function() {
            let dd = $("#startBar");
            let val = dd.options[dd.selectedIndex].value;
            if (val) {

                $("#list").innerHTML = "";
                app.doNext(val);
            }
            return false;
        },
        doNext: function(txt) {
            let mybar;
            if (txt) {
                mybar = app.next[txt];
            } else {
                let mybars = Object.keys(app.next);
                let idx = ~~(Math.random() * mybars.length);
                mybar = mybars[idx];
            }
            $("#list").innerHTML = "";
            app.clearLayer();
            app.state.seen = [];
            app.state.seen[txt] = 1;
            app.state.markers = [];
            app.state.layers = [];
            app.state.layers[0] = L.featureGroup([]);
            app.state.layers[0].addTo(app.map);
            app.state.markerClusterGroup = app.createMarkerClusterGroup();
            app.map.addLayer(app.state.markerClusterGroup);

            app.showNext(mybar);
        },
        showNext: function(mybar, barcnt=0) {
            let bar;
            if (typeof(mybar)==="string") {
                bar = app.next[mybar];
            } else {
                bar = mybar;
            }
            let clue = mybar.clue;
            let ctxt = clue ? clue : '';
            let fullbar = app.bars.find(item=>item.name==bar.name);
            let checked = app.state.visited[bar.name] ? " checked" : "";
            let el = document.createElement("li");
            let stats = '';

            if (app.state.visited[bar.name]) {
                let visited = app.state.visited[bar.name];
                stats = `
<div class='stats'>
    <div><label>Visits: </label> <span class='stat'>${visited.visits}</span></div>
    <div><label>First Visit: </label> <span class='stat'>${visited.first_visit}</span></div>
    <div><label>Last Visit: </label> <span class='stat'>${visited.last_visit}</span></div>
    <div><label>Notes: </label> <span class='stat'>${visited.notes}</span></div>
</div>`;
                    
            }

            el.innerHTML = `
                <details>
                    <summary><input type='checkbox' name='${bar.name}' id='${bar.name.replace(/\W/,'')}'${checked}><a onclick="return app.goto('${bar.name.replace(/\'/, "\\\'")}', ${fullbar.lat}, ${fullbar.lng}, event)" href='#${bar.name}'> ${bar.name}</a></summary>
                    <div class="detail">
                        <div><span class='addr'>${fullbar.address}</span></div>
                        <div><em><span class='clue'>${ctxt}</span></em></div>
                    </div>
                    ${stats}
                </details>`;
            let nextBar;
            
            let icon = L.divIcon({className: "marker", html: `<div class='marker'><span class='label'>${bar.name}</span></div>`});
            let marker = L.marker([fullbar.lat, fullbar.lng], { icon: icon, title: bar.name }).bindPopup(`<h2>${bar.name}</h2><hr>${fullbar.address}<br>${ctxt}`);

            marker.addTo(app.state.markerClusterGroup);
            app.state.markers.push(marker);

            // Get next closest bar we haven't seen
            if (bar.closest) {
                for (let i=0; i<bar.closest.length; i++) {
                    if (!app.state.seen[bar.closest[i]]) {
                        nextBar = app.next[bar.closest[i]].name;
                        i = bar.closest.length;
                        app.state.seen[nextBar] = 1;
                    }
                }
            }
            $("ol#list").append(el); 
            if (nextBar && barcnt < 5) {
                app.showNext(nextBar, barcnt + 1);
            } else {
                app.map.fitBounds(app.state.markerClusterGroup.getBounds());
            }
        },
        clearLayer: function() {
            if (app.state.markerClusterGroup) {
                app.map.removeLayer(app.state.markerClusterGroup);
            }
        },
        makeIcon: function(hood, bar) {
            let ico = L.divIcon({className: "marker", html: `<div class='marker ${hood}'><span class='label'>${bar}</span></div>`});
            app.data.icons.push(ico);
            return ico;
        },
        createMarkerClusterGroup: function(className='') {
            let barcluster = L.markerClusterGroup({
                iconCreateFunction: function(cluster) {
                    var markers = cluster.getAllChildMarkers();
                    var n = 0;

                    return L.divIcon({
                      html: `<span class='cluster-count'>${markers.length}</span>`,
                      className: 'marker-many ' + className,
                      iconSize: L.point(50, 50)
                    });
                }
            });

            app.state.markerClusterGroups.push(barcluster);

            return app.state.markerClusterGroups[app.state.markerClusterGroups.length -1];;
        },
        buildSelect: function(data) {
            let out = `<select onchange="return app.doStart()" id="startBar"><option>  -- Select Starting Point --</option>`;

            data.forEach(item=> {
                out += `<option value="${item.name}">${item.name}</option>`;
            });
            out += `</select>`;
            return out;
        },

        showVisitedCal: function(when) {
            let datetime = when.split(/\,\s*/);
            let parts = datetime[0].split(/\//);
            let month = app.config.months[parts[0] - 1];

            let out = "<div class='tinycal'><div class='calhead'>"+month+"</div><div class='caldate'>"+parts[1]+"</div><div class='calyear'>"+parts[2]+"</div></div>";

            return out;;
        },
        showBars: function(data) {
            if (!app.bars && data) app.bars = data;
            let bdd = app.buildSelect(data);
            $("#barsDropdown").innerHTML = bdd;

            let out = "";
            app.next = [];
            app.state.markerClusterGroup = app.createMarkerClusterGroup();
            app.map.addLayer(app.state.markerClusterGroup);

            data.forEach(bar => {
                app.next[bar.name] = bar;
                bar.name = bar.name.replace(/\&amp;/, '&');
                let check = (app.state.visited[bar.name]) ? "checked='checked'" : '';
                let stats = "";

                if (app.state.visited[bar.name]) {
                    let visited = app.state.visited[bar.name];
                    let vfirst = app.showVisitedCal(visited.first_visit);
                    let vlast = app.showVisitedCal(visited.last_visit);

                    stats = `
    <div class='stats'>
        <div><label>Visits: </label> <span class='stat'>${visited.visits}</span></div>
        ${vfirst}
        ${vlast}
    </div>`;
                        
                }

                out += `<li name="${bar.name}">
                            <details>
                    <summary><input type='checkbox' id='${bar.name.replace(/\W/,'')}' name="${bar.name}" ${check}> <a href='#${bar.name}'>${bar.name}</a></summary>
                                <span class='addr'>${bar.address}</span><br>
                                <span class='addr'>${bar.clue}</span><br>
                                ${stats}
                            </details>
                    </li>`;

                let icon = L.divIcon({className: "marker", html: `<div class='marker'><span class='label'>${bar.name}</span></div>`});
                let marker = L.marker([bar.lat, bar.lng], { icon: icon, title: bar.name }).bindPopup(`<h2>${bar.name}</h2><hr>${bar.address}<br>${bar.clue}`);

                marker.addTo(app.state.markerClusterGroup);
                app.state.markers.push(marker);
            });

            $("#list").innerHTML = out;
        },
        doInput: function(e) {
            console.dir(e);
            
            if (e.target.type === "checkbox") {
                if (!e.target.hasAttribute("checked")) {
                    if (app.state.visited[e.target.name]) {
                        app.state.visited[e.target.name].visits++;
                        app.state.visited[e.target.name].last_visit = new Date().toLocaleString();
                        app.state.visited[e.target.name].notes = "";
                    } else {
                        app.state.visited[e.target.name] = { name: e.target.name, visits: 1, first_visit: new Date().toLocaleString(), last_visit: new Date().toLocaleString() };
                    }
                    let v = Object.keys(app.state.visited);

                    celebrate(e, v.length);
                    e.target.setAttribute("checked", "checked");
                    console.log(`Saved ${e.target.name} visit [${app.state.visited[e.target.name].visits} visits]`);
                } else {
                    if (app.state.visited[e.target.name]) {
                        delete app.state.visited[e.target.name];
                    }
                    e.target.removeAttribute("checked");
                    console.log(`Removed ${e.target.name} from list`);
                }
                console.dir(app.state.visited);
                app.saveSettings('visits', app.state.visited);
            } else if (e.target.tagName === "LI") {
                let b = e.target.getAttribute('name');
                e.target.querySelector("details").toggleAttribute("open");
            }
        },
        showHoods: function(data) {

        },
        display: function(data, tgt) {
            let out = "<table><thead><tr>";
            const keys = Object.keys(data[0]);
            if (keys) {
                keys.forEach(key => {
                    out += `<th>${key}</th>`;
                });
            }
            out += "</tr></thead><tbody>";
            data.forEach(item=>{
                out += `<tr>`;
                keys.forEach(key => {
                    out += `<td>${item[i]}</td>`;
                });
                out += `</tr>`;
            });
            out += "</tbody></table>";

            if (tgt) {
                tgt.innerHTML = out;
            }
            return out;
        },
        findClosest: function(lat, lng) {
            const me = { lat: lat, lng: lng };
            let closest = 9999999999;
            let closestBar = "";

            app.bars.forEach(bar=>{
                let dist = app.getDistance(me, bar);
                if (dist < closest) {
                    closest = dist;
                    closestBar = bar;
                }
            });
            return closestBar;
        },
        gotPosition: function(pos) {
            let me = { lat: pos.coords.latitude, lng: pos.coords.longitude };
            let closestBar = app.findClosest(pos.coords.latitude, pos.coords.longitude);
            app.doNext(closestBar.name);
            app.hideOverlay();
        },
        getPosition: function() {
          app.showOverlay();
          if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(app.gotPosition);
          } else { 
              app.hideOverlay();
            console.log("Geolocation is not supported by this browser.");
          }

        },
        getDistance: function( from, to ) {
            let latFrom = from.lat * 0.0174533;
            let lonFrom = from.lng * 0.0174533;
            let latTo = to.lat * 0.0174533;
            let lonTo = to.lng * 0.0174533;

            let latDelta = latTo - latFrom;
            let lonDelta = lonTo - lonFrom;

            let angle = 2 * Math.asin(Math.sqrt(Math.pow(Math.sin(latDelta / 2), 2) + Math.cos(latFrom) * Math.cos(latTo) * Math.pow(Math.sin(lonDelta / 2), 2)));
            return angle * 6371000;
        },
        goto: function(bar, lat, lng, e) {
            if (e) {
                e.preventDefault();
                e.stopPropagation();
            }

            console.log(`Flying to ${bar} [${lat}, ${lng}]`);

            app.map.flyTo([lat, lng], 18);
            app.doNext(bar);
            return false;
        }, 
        showOverlay: function() {
            $("#overlayWrap").style.display = "block";
        },
        hideOverlay: function() {
            $("#overlayWrap").style.display = "none";
        }, 
        showAbout: function() {
            $("#about").style.transform = "translateX(0vw)";
        },
        hideAbout: function() {
            $("#about").style.transform = "translateX(-100vw)";
        }

    }
    window.app = app;
    app.init();
})();

