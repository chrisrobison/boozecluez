const $ = str => document.querySelector(str);
const $$ = str => document.querySelectorAll(str);

(function() {
    const app = {
        debug: 1,
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
            closests: {},
            markers: [],
            layers: [],
            markerClusterGroups: [],
            currentClosest: []
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
            $("main").addEventListener("click", app.openBar);
            document.addEventListener("contextmenu", app.doContext);

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

            app.state.mybar = mybar;
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

            app.showNext(mybar, 0, 0);
        },
        showMore: function(barcnt=0) {

            document.querySelector("#more").parentElement.removeChild(document.querySelector("#more"));
            app.showNext(app.state.mybar, barcnt, 0);
        },
        updateVenue: function(mybar) {
            let bar;
            console.log(`updateVenue`);
            console.dir(mybar);

            if (typeof(mybar)==="string") {
                bar = app.bars.find(item=>item.cleanname==mybar);
                if (!bar) app.bars.find(item=>item.name == mybar);
            } else {
                bar = mybar;
            }
            console.dir(`bar: ${bar}`);
            let clue = mybar.clue;
            let ctxt = clue ? clue : '';
            let fullbar = app.bars.find(item=>item.cleanname==bar.cleanname);
            let checked = app.state.visited[bar.name.replace(/\W/g, '')] ? " checked" : "";
            let el = document.createElement("li");
            let stats = '';
            let cleanname = bar.name.replace(/\W/g, '');
            let visits = 0;            
            el.id = 'bar_' + cleanname;

            if (app.state.visited[cleanname]) {
//                    let vfirst = app.showVisitedCal(visited.first_visit);
//                    let vlast = app.showVisitedCal(visited.last_visit);
                let visited = app.state.visited[cleanname];
                let visitlist = '';
                if (visited && visited.visits && visited.visits.length) {
                    visited.visits.forEach((item, idx)=>{ visitlist += `<li>${item} <button onclick='return app.rmVisit("${cleanname}","${idx}")' class='rmVisit'>x</button></li>` });
                    visits = ' <span class="tiny">' + visited.visits.length + '</span>';
                }

                stats = `<div class='stats'><div class='tinycal'><div class='calhead' style='background:#09f'>Visits</div><ol class='visits'>${visitlist}</ol></div></div>`;
            }

            el.innerHTML = `
                <details>
                    <summary><input type='checkbox' name='${bar.name}' id='${bar.name.replace(/\W/g,'')}'${checked}><a onclick="return app.goto('${bar.name.replace(/\'/g, "\\\'")}', ${fullbar.lat}, ${fullbar.lng}, event)" href='#${bar.name}'> ${bar.name}</a> ${visits}</summary>
                    <div class="detail">
                        <div><span class='addr'>${fullbar.address}</span></div>
                        <div><em><span class='clue'>${ctxt}</span></em></div>
                    </div>
                    ${stats}
                </details>`;
            $(`#bar_${cleanname}`).innerHTML = el.innerHTML;
            $(`#bar_${cleanname} > details`).setAttribute("open", true);     
        },
        showNext: function(mybar, barcnt=0, batchcnt=0) {
            let bar;
            if (typeof(mybar)==="string") {
                bar = app.next[mybar];
            } else {
                bar = mybar;
            }
            let clue = mybar.clue;
            let ctxt = clue ? clue : '';
            let fullbar = app.bars.find(item=>item.name==bar.name);
            let checked = app.state.visited[bar.name.replace(/\W/g, '')] ? " checked" : "";
            let el = document.createElement("li");
            let stats = '';
            let cleanname = bar.name.replace(/\W/g, '');
            let visits = "";

            el.id = 'bar_'+cleanname;

            if (app.state.visited[cleanname]) {
//                    let vfirst = app.showVisitedCal(visited.first_visit);
//                    let vlast = app.showVisitedCal(visited.last_visit);
                let visited = app.state.visited[cleanname];
                let visitlist = '';
                if (visited && visited.visits && visited.visits.length) {
                    visited.visits.forEach((item, idx)=>{ visitlist += `<li>${item} <button onclick='return app.rmVisit("${cleanname}","${idx}")' class='rmVisit'>x</button></li>` });
                    visits = " <span class='tiny'>" + visited.visits.length  + "</span>";
                }

                stats = `<div class='stats'><div class='tinycal'><div class='calhead' style='background:#09f'>Visits</div><ol class='visits'>${visitlist}</ol></div></div>`;
                    
            }

            el.innerHTML = `
                <details>
                    <summary><input type='checkbox' name='${bar.name}' id='${bar.name.replace(/\W/g,'')}'${checked}><a onclick="return app.goto('${bar.name.replace(/\'/g, "\\\'")}', ${fullbar.lat}, ${fullbar.lng}, event)" href='#${bar.name}'> ${bar.name}</a>${visits}</summary>
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

            if (app.state.currentClosest) {
                nextBar = app.state.currentClosest[barcnt+1].name;
            } else {
                app.state.closests[bar.cleanname] = app.getClosestList(bar.cleanname);
                nextBar = app.state.closests[bar.cleanname][0].name;
            }
            $("ol#list").append(el); 
            if (nextBar && batchcnt < 6) {
                app.showNext(nextBar, barcnt + 1, batchcnt + 1);
            } else {
                let more = document.createElement("li");
                more.id = "more";
                more.innerHTML = `<a class='more' href='#more' onclick='return app.showMore(${barcnt})'>Show more...</a>`;
                $("ol#list").append(more);
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

            let out = `<div class='tinycal'><div class='calhead'>${month}</div><div class='caldate'>${parts[1]}</div><div class='calyear'>${parts[2]}</div></div>`;

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
                bar.name = bar.name.replace(/\&amp;/g, '&');
                let cleanname = bar.name.replace(/\W/g, '');
                let check = (app.state.visited[cleanname]) ? "checked='checked'" : '';
                let stats = "", visits = "";

                if (app.state.visited[cleanname]) {
//                    let vfirst = app.showVisitedCal(visited.first_visit);
//                    let vlast = app.showVisitedCal(visited.last_visit);
                    let visited = app.state.visited[cleanname];
                    let visitlist = '';
                    if (visited && visited.visits && visited.visits.length) {
                        visited.visits.forEach((item, idx)=>{ visitlist += `<li>${item} <button onclick='return app.rmVisit("${cleanname}","${idx}")' class='rmVisit'>x</button></li>` });
                        visits = ` <span class='tiny'>${visited.visits.length}</span>`;
                    }

                    stats = `<div class='stats'><div class='tinycal'><div class='calhead' style='background:#09f'>Visits</div><ol class='visits'>${visitlist}</ol></div></div>`;
                        
                }

                out += `<li id="bar_${cleanname}" name="${bar.name}">
                            <details>
                    <summary><input type='checkbox' id='${cleanname}' name="${bar.name}" ${check}> <a href='#${cleanname}'>${bar.name}</a> ${visits}</summary>
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
        openBar: function(e) {
            if (app.debug) {
                console.log("openBar");
                console.dir(e);
            }
            if (e.target.tagName === "LI") {
                let el = e.target;

                let detail = el.querySelector("details");
                if (detail) {
                    if (detail.open) {
                        detail.removeAttribute("open");
                    } else {
                        detail.setAttribute("open", true);
                        detail.open = true;
                    }
                }
            }
        },
        doContext: function(e) {
            if (app.debug) {
                console.log("doContext");
                console.dir(e);
            }
        },
        rmVisit: function(bar, visit) {
            if (app.state.visited[bar] && app.state.visited[bar].visits) {
                app.state.visited[bar].visits.splice(visit, 1);
                app.updateVenue(bar);
            }
        },
        doInput: function(e) {
            if (app.mouseTO) {
                clearTimeout(app.mouseTO);
            }
            console.dir(e);
           e.stopPropagation();
            if ((app.currentEl != e.target) || (app.currentEl == e.target && app.currentAction !== "removed")) {
                if (e.target.type === "checkbox") {
                    let mybarname = e.target.id.replace(/^bar_/, '');;
                    let mybar = app.bars.find(item=>item.cleanname===mybarname);

                    if (!e.target.hasAttribute("checked")) {
                        console.log("bar not checked and we clicked it");
                        if (app.state.visited[e.target.id]) {
                            console.log("bar was not checked but had visited entry anyway.  updating existing entry");
                            app.state.visited[e.target.id].visits.push(new Date().toLocaleString());
                            app.state.visited[e.target.id].notes = "";
                        } else {
                            console.log(`Creating new visited entry for ${e.target.id}`);
                            app.state.visited[e.target.id] = { name: e.target.name, visits: [ new Date().toLocaleString() ], notes: "" };
                        }
                        let v = Object.keys(app.state.visited);

                        celebrate(e, v.length);
                        e.target.setAttribute("checked", "checked");
                        e.target.checked = true;
                        console.log(`Saved ${e.target.id} visit [${app.state.visited[e.target.id].visits} visits]`);
                    } else {
                        e.preventDefault();
                        if (app.state.visited[e.target.id]) {
                            console.log(`Updating existing visits for ${e.target.id}`);
                            app.state.visited[e.target.id].visits.push(new Date().toLocaleString());
                            e.target.setAttribute("checked", "checked");
                            e.target.checked = true;
                        }
                    }
                    if (mybar) {
                        app.updateVenue(mybar);
                    }
                    console.dir(app.state.visited);
                    app.saveSettings('visits', app.state.visited);
                    e.target.checked = true;

                    return false;
                } else if ((e.target.tagName === "LI") || (e.target.tagName==="A")) {
                    let b = e.target.getAttribute('name');
                    e.target.querySelector("details").toggleAttribute("open");
                }
            }
            return false;
        },
        
        removeVisit: function() {
            console.log("*** in removeVisit");
            if (app.currentItem) {
                delete app.state.visited[app.currentItem];
                    
                app.currentEl.removeAttribute("checked");
                console.log(`Removed ${app.currentItem} from list`);
                app.currentAction = 'removed';

                setTimeout(function() { app.currentAction = ''; app.currentItem = ''; app.currentEl = ''; }, 1000);
            }
        },
        doUp: function(e) {
            if (app.mouseTO) {
                clearTimeout(app.mouseTO);
            }
        },
        doDown: function(e) {
            console.log("doDown");
            console.dir(e);
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
            let closestBars = [];

            app.bars.forEach(bar=>{
                let dist = app.getDistance(me, bar);
                if (dist < closest) {
                    closest = dist;
                    closestBar = bar;
                }
                closestBars.push({ name: bar.name, distance: dist});
            });
            closestBars.sort((a, b) => a.distance - b.distance);
            console.log("Closest Bars:");
            console.dir(closestBars);
            app.state.currentClosest = closestBars;

            return closestBar;
        },
        getClosestList: function(bar) {
            let obj;
            let venue;

            if (typeof(bar)==="string") {
                venue = bar;
                obj = app.bars.find(item=>item.name==bar);
                if (!obj) obj = app.bars.find(item=>item.cleanname == bar);
            } else {
                obj = bar;
                venue = obj.name;
            }
            const me = { lat: obj.latitude, lng: obj.longitude };

            if (!me.lat || !me.lng) {
                if (app.state.currentClosest) return app.state.currentClosest;
                console.error("Could not get latlon to retrieve closest venues");
                return;
            }
            let closest = 9999999999;
            let closestBar = "";
            let closestBars = [];

            app.bars.forEach(loc=>{
                let dist = app.getDistance(me, loc);
                closestBars.push({ name: loc.name, distance: dist});
            });
            closestBars.sort((a, b) => a.distance - b.distance);
            app.state.closests[venue] = closestBars;

            console.log("Closest Bars:");
            console.dir(closestBars);
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
        // returns in feet
        getDistance: function( from, to ) {
            let latFrom = from.lat * 0.0174533;
            let lonFrom = from.lng * 0.0174533;
            let latTo = to.lat * 0.0174533;
            let lonTo = to.lng * 0.0174533;

            let latDelta = latTo - latFrom;
            let lonDelta = lonTo - lonFrom;

            let angle = 2 * Math.asin(Math.sqrt(Math.pow(Math.sin(latDelta / 2), 2) + Math.cos(latFrom) * Math.cos(latTo) * Math.pow(Math.sin(lonDelta / 2), 2)));
            return ~~((angle * 6371000) * 1.09) * 3;      // multiply angle * radius of earth(km) then convert to yards and then to feet
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
            setTimeout(function() { app.hideOverlay(); }, 3000);
        },
        hideOverlay: function() {
            $("#overlayWrap").style.display = "none";
        }, 
        showAbout: function() {
            $("#about").style.display = "flex";
            $("#about").style.transform = "translateX(0vw)";
        },
        hideAbout: function() {
            $("#about").style.transform = "translateX(100vw)";
            setTimeout(function() { $("#about").style.display = "none"; }, 1000);
        },
        showAddBar: function() {
            $("#addBar").style.display = "flex";
            $("#addBar").style.transform = "translateX(0vw)";
        },
        hideAddBar: function() {
            $("#addBar").style.transform = "translateX(100vw)";
            setTimeout(function() { $("#addBar").style.display = "none"; }, 1000);
        },
        addBar: function(name, addr, evt) {
            if (evt) {
                evt.preventDefault();
                evt.stopPropagation();
            }
            name = encodeURIComponent(name);
            addr = encodeURIComponent(addr);
            let url = `api.php?x=addbar&name=${name}&addr=${addr}`;
            fetch(url).then(r=>r.json()).then(data=>{
                console.dir(data);
            });
            
            app.hideAddBar();
            return false;
        },
        showMyList: function() {
            let stats = "";
            let allbars = Object.keys(app.state.visited);
            for (let i=0; i<allbars.length; i++) {
                let el = document.createElement("li");
                let visits = "";
                let visited = app.state.visited[allbars[i]];
                let bar = app.next[visited.name];

                let cleanname = allbars[i];
                let fullbar = bar;
                
                el.id = 'bar_'+cleanname;
                
                let ctxt = "";
                
                let visitlist = '';
                if (visited && visited.visits && visited.visits.length) {
                    visited.visits.forEach((item, idx)=>{ visitlist += `<li>${item} <button onclick='return app.rmVisit("${cleanname}","${idx}")' class='rmVisit'>x</button></li>` });
                    visits = " <span class='tiny'>" + visited.visits.length  + "</span>";
                }

                stats = `<div class='stats'><div class='tinycal'><div class='calhead' style='background:#09f'>Visits</div><ol class='visits'>${visitlist}</ol></div></div>`;
                    

                el.innerHTML = `
                    <details>
                        <summary><input type='checkbox' name='${bar.name}' id='${bar.name.replace(/\W/g,'')}' CHECKED><a onclick="return app.goto('${bar.name.replace(/\'/g, "\\\'")}', ${fullbar.lat}, ${fullbar.lng}, event)" href='#${bar.name}'> ${bar.name}</a>${visits}</summary>
                        <div class="detail">
                            <div><span class='addr'>${fullbar.address}</span></div>
                        </div>
                        ${stats}
                    </details>`;
                let nextBar;
                
                let icon = L.divIcon({className: "marker", html: `<div class='marker'><span class='label'>${bar.name}</span></div>`});
                let marker = L.marker([fullbar.lat, fullbar.lng], { icon: icon, title: bar.name }).bindPopup(`<h2>${bar.name}</h2><hr>${fullbar.address}<br>${ctxt}`);
                
                $("ol#list").append(el); 
                marker.addTo(app.state.markerClusterGroup);
                app.state.markers.push(marker);
            }
            app.map.fitBounds(app.state.markerClusterGroup.getBounds());
            
        },
        showMenu: function(e) {
            console.log("showMenu");
            if (e) e.preventDefault();
            $(".left").className = "left open";
            return false;
        },
        hideMenu: function(e) {
            if (e) e.preventDefault();
            $(".left").classList.remove("open");
            return false;

        }

    }
    window.app = app;
    app.init();
})();

