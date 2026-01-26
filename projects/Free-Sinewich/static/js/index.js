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

  function getGaussianKernel2D(size, sigma) {
    const kernel = [];
    const center = Math.floor(size / 2);
    let sum = 0;

    for (let y = 0; y < size; y++) {
      const row = [];
      for (let x = 0; x < size; x++) {
        const dx = x - center;
        const dy = y - center;
        const val = Math.exp(-(dx * dx + dy * dy) / (2 * sigma * sigma));
        row.push(val);
        sum += val;
      }
      kernel.push(row);
    }

    // Normalize
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        kernel[y][x] /= sum;
      }
    }
    return kernel;
  }

  // Precompute kernel
  const kernelSize = 7;
  const sigma = 1.0;
  const gaussianKernel = getGaussianKernel2D(kernelSize, sigma);


  // Checkbox listener
  const blurToggle = document.getElementById('blur-toggle');
  if (blurToggle) {
    blurToggle.addEventListener('change', update);
  }

  function drawMatrix(freq) {
    // If matrixContext or baseMatrix not ready, return
    if (!matrixContext || !baseMatrix) return;

    const w = matrixCanvas.width; // 512
    const h = matrixCanvas.height; // 512
    const channelSize = w * h;

    // We need a temporary buffer to store the sine-transformed values BEFORE blur
    // 3 channels * w * h
    const rawBuffer = new Float32Array(3 * w * h);

    // 1. Compute Sine Transform
    for (let i = 0; i < baseMatrix.length; i++) {
      // Range -1 to 1
      rawBuffer[i] = Math.sin(freq * baseMatrix[i]);
    }

    const data = matrixData.data;
    const halfK = Math.floor(kernelSize / 2);
    const applyBlur = blurToggle && blurToggle.checked;

    if (applyBlur) {
      // 2. Apply 2D Convolution & Map to Canvas
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          let r = 0, g = 0, b = 0;

          // Kernel Loop
          for (let ky = 0; ky < kernelSize; ky++) {
            for (let kx = 0; kx < kernelSize; kx++) {
              // Clamped coordinates
              const iy = Math.min(Math.max(y + ky - halfK, 0), h - 1);
              const ix = Math.min(Math.max(x + kx - halfK, 0), w - 1);

              const weight = gaussianKernel[ky][kx];
              const idx = iy * w + ix; // Pixel index

              r += rawBuffer[idx] * weight;
              g += rawBuffer[idx + channelSize] * weight;
              b += rawBuffer[idx + 2 * channelSize] * weight;
            }
          }

          // Map -1..1 to 0..255
          const rVal = Math.floor(((r + 1) / 2) * 255);
          const gVal = Math.floor(((g + 1) / 2) * 255);
          const bVal = Math.floor(((b + 1) / 2) * 255);

          const pixelIdx = (y * w + x) * 4;
          data[pixelIdx] = rVal;
          data[pixelIdx + 1] = gVal;
          data[pixelIdx + 2] = bVal;
          data[pixelIdx + 3] = 255;
        }
      }
    } else {
      // No Blur: Direct Map
      for (let i = 0; i < channelSize; i++) {
        const r = Math.floor(((rawBuffer[i] + 1) / 2) * 255);
        const g = Math.floor(((rawBuffer[i + channelSize] + 1) / 2) * 255);
        const b = Math.floor(((rawBuffer[i + 2 * channelSize] + 1) / 2) * 255);

        const idx = i * 4;
        data[idx] = r;
        data[idx + 1] = g;
        data[idx + 2] = b;
        data[idx + 3] = 255;
      }
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
    // Initial draw logic handled in fetch or here
    update();
  }
});