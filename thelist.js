const $ = str => document.querySelector(str);
const $$ = str => document.querySelectorAll(str);

(function() {
    const app = {
        data: [],
        state: {
            seen: {},
            loaded: false,
            visited: {},
            layers: [],
            markerClusterGroups: []
        },
        init: function() {
            let tmp = app.loadSettings('visits');
            if (tmp) app.state.visited = tmp;
            
            app.map = L.map($("#map"), { center: [ 37.757113, -122.442943], zoom: 11 });
            L.tileLayer('https://{s}.tile.osm.org/{z}/{x}/{y}.png', { attribution: '' }).addTo(app.map);
            app.fetch("closest.json", app.loadNext);
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

                $("main").innerHTML = "<form oninput='app.doInput(event)'><ol id='list'></ol></form>";
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
            let clue = app.clues[bar.name];
            let ctxt = clue ? clue.clue : '';
            let fullbar = app.bars.find(item=>item.name==bar.name);
            let checked = app.state.visited[bar.name] ? " checked" : "";
            let el = document.createElement("li");
            el.innerHTML = `
                <details>
                    <summary><input type='checkbox' onclick="app.doInput(event)" name='${bar.name}' id='${bar.name.replace(/\W/,'')}'${checked}><a onclick="return app.goto('${bar.name}', ${fullbar.lat}, ${fullbar.lng})" href='#${bar.name}'>${bar.name}</a></summary>
                    <div class="detail">
                        <span class='addr'>${fullbar.address}</span><br>
                        <em><span class='clue'>${ctxt}</span></em><br>
                    </div>
                </details>`;
            let nextBar;
            
            let icon = L.divIcon({className: "marker", html: `<div class='marker'><span class='label'>${bar.name}</span></div>`});
            let marker = L.marker([fullbar.lat, fullbar.lng], { icon: icon, title: bar.name }).bindPopup(`<h2>${bar.name}</h2><hr>${fullbar.address}<br>${ctxt}`);

            marker.addTo(app.state.markerClusterGroup);
            app.state.markers.push(marker);

            // Get next closest bar we haven't seen
            if (bar.closestBars) {
                for (let i=0; i<bar.closestBars.length; i++) {
                    if (!app.state.seen[bar.closestBars[i]]) {
                        nextBar = app.next[bar.closestBars[i]].name;
                        i = bar.closestBars.length;
                        app.state.seen[nextBar] = 1;
                    }
                }
            }
            $("ol#list").append(el); 
            if (nextBar && barcnt < 9) {
                app.showNext(nextBar, barcnt + 1);
            } else {
                app.map.fitBounds(app.state.markerClusterGroup.getBounds());
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
        showOrder: function(start) {
            let bar = app.next[start];
            if (bar) {
                var seen = {};
                out = "<ol>";
                let name = start;

                while (bar) {
                    let closest = bar.closestBar?.name || '';

                    let clue = app.clues[bar.name];
                    let ctxt = clue ? clue.clue : '';

                    out += `<li>
                                <details>
                                    <summary><input type='checkbox' id='${bar.name.replace(/\W/,'')}'><a href='#${bar.name}'>${bar.name}</a></summary>
                                    <label>Address:</label> <span class='addr'>${bar.address}</span><br>
                                    <label>Riddle:</label> <span class='addr'>${ctxt}</span><br>
                                    <label>Next Bar:</label> <span class='addr hidden'>${app.next[bar.name].closestBar.name} [${~~app.next[bar.name].distance}m]</span><br>
                                </details>
                        </li>`;
                    let oldbar = bar;

                    bar = app.next[bar.closestBar.name];
                    let newbar, newtxt;
                    if (!bar || seen[bar.name]) {
                        for (let i=0; i<oldbar.closestBars.length; i++) {
                            newbar = oldbar.closestBars[i];
                            if (!seen[newbar]) {
                                newtxt = newbar;
                                i = oldbar.closestBars.length;
                            }
                        }
                        if (newtxt) {
                            bar = app.next[newtxt];
                            seen[bar.name] = 1;
                        } else { 
                            break;
                        }
                    }
                    seen[bar.name] = 1;

                };

                out += `</ol>`;

                $("main").innerHTML = out;
            }
        },
        buildSelect: function(data) {
            let out = `<select onchange="return app.doStart()" id="startBar"><option>  -- Select Starting Point --</option>`;

            data.forEach(item=> {
                out += `<option value="${item.name}">${item.name}</option>`;
            });
            out += `</select>`;
            return out;
        },
        showBars: function(data) {
            if (!app.bars && data) app.bars = data;
            $("header").innerHTML = `<h1>Booze Cluez</h1> ${app.buildSelect(data)} <br><button onclick="return app.doStart()">Get List</button><button onclick="app.showBars(app.bars); return false;">All Bars</button><button onclick="app.getPosition()">Start From Here</button>`;

            let out = "<form oninput='app.doInput(event)'><ol>";

            data.forEach(bar => {
                bar.name = bar.name.replace(/\&amp;/, '&');
                let clue = app.clues[bar.name];
                let ctxt = clue ? clue.clue : '';
                let check = (app.state.visited[bar.name]) ? "checked='checked'" : '';
                out += `<li>
                            <details>
                    <summary><input type='checkbox' id='${bar.name.replace(/\W/,'')}' name="${bar.name}" ${check}> <a href='#${bar.name}'>${bar.name}</a></summary>
                                <label>Address:</label> <span class='addr'>${bar.address}</span><br>
                                <label>Riddle:</label> <span class='addr'>${ctxt}</span><br>
                                <label>Next Bars:</label> <span class='addr hidden'>${app.next[bar.name].closestBars.join(', ')}</span><br>
                            </details>
                    </li>`;
            });
            out += `</ol></form>`;

            $("main").innerHTML = out;
        },
        doInput: function(e) {
            console.dir(e);

            if (app.state.visited[e.target.name]) {
                app.state.visited[e.target.name].visits++;
            } else {
                app.state.visited[e.target.name] = { name: e.target.name, visits: 1, visited: new Date().toLocaleString };
            }
            app.saveSettings('visits', app.state.visited);
            console.log(`Saved ${e.target.name} visit [${app.state.visited[e.target.name].visits} visits]`);
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
        gotPosition: function(pos) {
            let me = { lat: pos.coords.latitude, lng: pos.coords.longitude };
            let closest = 999999999;
            app.bars.forEach(item=>{
                let dist = app.getDistance(me, item);
                if (dist < closest) {
                    closest = dist;
                    closestBar = item;
                }
            });
            $("main").innerHTML = "<ol id='list'></ol>";
            app.doNext(closestBar.name);
        },
        getPosition: function() {
          if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(app.gotPosition);
          } else { 
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
        goto: function(bar, lat, lng) {
            app.map.flyTo([lat, lng], 18);
            return false;
        }
    }
    window.app = app;
    app.init();
})();
