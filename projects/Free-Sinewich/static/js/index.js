window.HELP_IMPROVE_VIDEOJS = false;

var INTERP_BASE = "./static/interpolation/stacked";
var NUM_INTERP_FRAMES = 240;

var interp_images = [];
function preloadInterpolationImages() {
  for (var i = 0; i < NUM_INTERP_FRAMES; i++) {
    var path = INTERP_BASE + '/' + String(i).padStart(6, '0') + '.jpg';
    interp_images[i] = new Image();
    interp_images[i].src = path;
  }
}

function setInterpolationImage(i) {
  var image = interp_images[i];
  image.ondragstart = function () { return false; };
  image.oncontextmenu = function () { return false; };
  $('#interpolation-image-wrapper').empty().append(image);
}


$(document).ready(function () {
  // Check for click events on the navbar burger icon
  $(".navbar-burger").click(function () {
    // Toggle the "is-active" class on both the "navbar-burger" and the "navbar-menu"
    $(".navbar-burger").toggleClass("is-active");
    $(".navbar-menu").toggleClass("is-active");

  });

  var options = {
    slidesToScroll: 1,
    slidesToShow: 3,
    loop: true,
    infinite: true,
    autoplay: false,
    autoplaySpeed: 3000,
  }

  // Initialize all div with carousel class
  var carousels = bulmaCarousel.attach('.carousel', options);

  // Loop on each carousel initialized
  for (var i = 0; i < carousels.length; i++) {
    // Add listener to  event
    carousels[i].on('before:show', state => {
      console.log(state);
    });
  }

  // Access to bulmaCarousel instance of an element
  var element = document.querySelector('#my-element');
  if (element && element.bulmaCarousel) {
    // bulmaCarousel instance is available as element.bulmaCarousel
    element.bulmaCarousel.on('before-show', function (state) {
      console.log(state);
    });
  }

  /*var player = document.getElementById('interpolation-video');
  player.addEventListener('loadedmetadata', function() {
    $('#interpolation-slider').on('input', function(event) {
      console.log(this.value, player.duration);
      player.currentTime = player.duration / 100 * this.value;
    })
  }, false);*/
  preloadInterpolationImages();

  $('#interpolation-slider').on('input', function (event) {
    setInterpolationImage(this.value);
  });
  setInterpolationImage(0);
  $('#interpolation-slider').prop('max', NUM_INTERP_FRAMES - 1);

  bulmaSlider.attach();

})

document.addEventListener('DOMContentLoaded', function () {
  // Initialize the carousel
  bulmaCarousel.attach('#results-carousel', {
    slidesToScroll: 1,
    slidesToShow: 1,
    pagination: true,
    loop: true,
    autoplay: false
  });
});

document.addEventListener('DOMContentLoaded', function () {
  // Initialize the depth estimation carousel
  bulmaCarousel.attach('#depth-results-carousel', {
    slidesToScroll: 1,
    slidesToShow: 1,
    pagination: true,
    loop: true,
    autoplay: false
  });
});

document.addEventListener('DOMContentLoaded', function () {
  const canvas = document.getElementById('sine-canvas');
  if (!canvas) return;

  const context = canvas.getContext('2d');

  // Matrix Visualization Setup
  const matrixCanvas = document.getElementById('matrix-canvas');
  let matrixContext, matrixData, baseMatrix;

  if (matrixCanvas) {
    matrixContext = matrixCanvas.getContext('2d');
    const w = matrixCanvas.width;
    const h = matrixCanvas.height;
    matrixData = matrixContext.createImageData(w, h);

    // Fetch the binary matrix data
    fetch('./static/matrix/matrix_data.bin')
      .then(response => {
        if (!response.ok) {
          throw new Error("HTTP error " + response.status);
        }
        return response.arrayBuffer();
      })
      .then(buffer => {
        // Data is float32, size 3x512x512
        // C-order: [Channel 0, Channel 1, Channel 2]
        baseMatrix = new Float32Array(buffer);
        console.log("Matrix loaded, size:", baseMatrix.length);
        // Initial draw after load
        update();
      })
      .catch(e => {
        console.error("Failed to load matrix data:", e);
        // Fallback to noise if load fails (optional, or just leave blank)
        /*
        baseMatrix = new Float32Array(3 * w * h);
        for(let i=0; i<baseMatrix.length; i++) baseMatrix[i] = Math.random();
        update();
        */
      });
  }

  const slider = document.getElementById('freq-slider');
  const freqVal = document.getElementById('freq-val');
  const secretContainer = document.getElementById('secret-image-container');

  const targetFreq = 42;
  const tolerance = 2;

  function drawSine(freq) {
    const width = canvas.width;
    const height = canvas.height;
    context.clearRect(0, 0, width, height);

    context.beginPath();
    context.moveTo(0, height / 2);

    for (let x = 0; x < width; x++) {
      const y = height / 2 + Math.sin(2 * Math.PI * (x / width) * freq) * (height / 3);
      context.lineTo(x, y);
    }

    context.strokeStyle = '#209cee';
    context.lineWidth = 3;
    context.stroke();
  }

  function drawMatrix(freq) {
    // If matrixContext or baseMatrix not ready, return
    if (!matrixContext || !baseMatrix) return;

    const w = matrixCanvas.width; // 512
    const h = matrixCanvas.height; // 512
    // baseMatrix should be 3 * 512 * 512
    const channelSize = w * h;

    const data = matrixData.data;

    for (let i = 0; i < channelSize; i++) {
      // Values are in 3 blocks: [Ch0...][Ch1...][Ch2...]
      const v1 = baseMatrix[i];
      const v2 = baseMatrix[i + channelSize];
      const v3 = baseMatrix[i + 2 * channelSize];

      // Apply sine transform: sin(freq * val)
      // We use the same frequency for all channels
      // Map sine output (-1 to 1) to (0 to 255)

      const r = Math.floor(((Math.sin(freq * v1) + 1) / 2) * 255);
      const g = Math.floor(((Math.sin(freq * v2) + 1) / 2) * 255);
      const b = Math.floor(((Math.sin(freq * v3) + 1) / 2) * 255);

      const idx = i * 4;
      data[idx] = r;
      data[idx + 1] = g;
      data[idx + 2] = b;
      data[idx + 3] = 255; // Alpha
    }

    matrixContext.putImageData(matrixData, 0, 0);
  }

  function update() {
    const val = parseInt(slider.value);
    if (freqVal) freqVal.textContent = val;
    drawSine(val);
    drawMatrix(val);

    if (secretContainer) {
      if (Math.abs(val - targetFreq) <= tolerance) {
        secretContainer.style.opacity = '1';
      } else {
        secretContainer.style.opacity = '0';
      }
    }
  }

  if (slider) {
    slider.addEventListener('input', update);
    update();
  }
});