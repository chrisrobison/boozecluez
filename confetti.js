// global variables
//const confetti = document.getElementById('confetti');
//const confettiCtx = confetti.getContext('2d');
let container = { h: 500, w: 500 }, confettiElements = [],
    clickPosition = [ window.innerWidth / 2, window.innerHeight / 2];

const panel = document.querySelector("#panel");

// helper
rand = (min, max) => Math.random() * (max - min) + min;

// params to play with
const confettiParams = {
    // number of confetti per "explosion"
    number: 25,
    // min and max size for each rectangle
    size: {
        x: [5, 20],
        y: [10, 18]
    },
    // power of explosion
    initSpeed: 20,
    // defines how fast particles go down after blast-off
    gravity: 0.35,
    // how wide is explosion
    drag: 0.08,
    // how slow particles are falling
    terminalVelocity: 1,
    // how fast particles are rotating around themselves
    flipSpeed: .1,
    rotateSpeed: ~~(Math.random() * 100) + 1
};
const colors = [
    { front: '#3B870A', back: '#235106' },
    { front: '#B96300', back: '#6f3b00' },
    { front: '#E23D34', back: '#88251f' },
    { front: '#CD3168', back: '#7b1d3e' },
    { front: '#664E8B', back: '#3d2f53' },
    { front: '#394F78', back: '#222f48' },
    { front: '#008A8A', back: '#005353' },
];

updateConfetti();

window.addEventListener('resize', () => { hideConfetti(); });

// Confetti constructor
function Conf() {
    this.randomModifier = rand(-1, 1);
    this.colorPair = colors[Math.floor(rand(0, colors.length))];
    this.dimensions = {
        x: rand(confettiParams.size.x[0], confettiParams.size.x[1]),
        y: rand(confettiParams.size.y[0], confettiParams.size.y[1]),
    };
    this.position = {
        x: clickPosition[0],
        y: clickPosition[1]
    };
    this.rotation = rand(0, 2 * Math.PI);
    this.scale = {
        x: 1,
        y: 1
    };
    this.velocity = {
        x: rand(-confettiParams.initSpeed, confettiParams.initSpeed) * 0.4,
        y: rand(-confettiParams.initSpeed, confettiParams.initSpeed)
    };
    this.flipSpeed = rand(0.2, 1.5) * confettiParams.flipSpeed;

    if (this.position.y <= container.h) {
        this.velocity.y = -Math.abs(this.velocity.y);
    }
    
    this.terminalVelocity = rand(1, 1.5) * confettiParams.terminalVelocity;
    
    this.element = document.createElement("div");
    this.element.className = "glitter";

    let html = "<div class='glitter-inner'><div class='glitter-front'></div><div class='glitter-back'></div></div>";

    this.element.style.backgroundColor = this.colorPair.front;
    this.element.style.top = this.position.y + "px";
    this.element.style.left = this.position.x + "px";
    this.rotate = ~~(Math.random()*360);
	this.element.style.transform = `rotate3d(1,1,1,${this.rotate}deg)`;
document.querySelector("#panel").append(this.element);

    this.update = function() {
        this.velocity.x *= 0.98;
        this.position.x += this.velocity.x;

        this.velocity.y += (this.randomModifier * confettiParams.drag);
        this.velocity.y += confettiParams.gravity;
        this.velocity.y = Math.min(this.velocity.y, this.terminalVelocity);
        this.position.y += this.velocity.y;
        this.rotate += (this.rotateSpeed * this.randomModifier);
        
        this.scale.y = Math.cos((this.position.y + this.randomModifier) * this.flipSpeed);
        this.color = this.scale.y > 0 ? this.colorPair.front : this.colorPair.back;
    }
}

function updateConfetti() {
 //   confettiCtx.clearRect(0, 0, container.w, container.h);

    confettiElements.forEach((c) => {
        c.update();
        c.element.style.top = c.position.y + "px";
        c.element.style.left = c.position.x + "px";
	    c.element.style.transform = "rotate3d(1,1,1, "+ (c.rotate) + "deg)";
    });

    confettiElements.forEach((c, idx) => {
        if (c.position.y > window.innerHeight ||
            c.position.x < -0.5 * window.innerWidth ||
            c.position.x > 1.5 * window.innerWidth) {
			   
                confettiElements[idx].element.parentElement.removeChild(confettiElements[idx].element);
                confettiElements.splice(idx, 1)
        }
    });
	if (confettiElements.length) {
        window.requestAnimationFrame(updateConfetti);
    }
}

function addConfetti(e) {
    if (e) {
        clickPosition = [
            e.x,
            e.y
        ];
    } else {
        clickPosition = [
            container.w * Math.random(),
            container.h * Math.random()
        ];
    }
    for (let i = 0; i < confettiParams.number; i++) {
        confettiElements.push(new Conf())
    }
}
function addDivConfetti(e, cnt=0) {
    if (e && e.x && e.y) {
        clickPosition = [ e.x, e.y ];
    } else {
        clickPosition = [
            window.innerWidth / 2,
            window.innerHeight / 2
        ];
    }
    cnt = (cnt) ? cnt : confettiParams.number;

    for (let i = 0; i < cnt; i++) {
        confettiElements.push(new Conf());
    }
    updateConfetti();
}

function celebrate(e, num) {
    addDivConfetti(e);
    let cnt = ~~(Math.random() * 5) + 2;
    for (let i = 0; i < cnt; i++) {
        setTimeout(function() { addDivConfetti(); }, ~~(Math.random() * 2000));
    }
    
    setTimeout(function() { addBalloon(e, num); }, ~~(Math.random() * 4000));


}
let balloons = [];

function addBalloon(e, num) {
    let wrap = document.createElement("div");
    wrap.className = "balloon";
    wrap.innerHTML = num;
    wrap.style.left = "40%";
    wrap.addEventListener("click", function(e) {
        addDivConfetti(e, 15);
        wrap.style.display = "none";
    });

    $("body").append(wrap);
    balloons.push(wrap);
    setTimeout(function() { $("body").removeChild(wrap); }, 8000);
}

function hideConfetti() {
    confettiElements.forEach(item=>item.element.parentElement.removeChild(item.element));
    confettiElements = [];
}


