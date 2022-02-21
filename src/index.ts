const INF = 1e20;

export const SDF_RADIUS = 8;

export function getLetterHeight() {
  return 2.0;
}

export default class TinySDF {
  fontSize: number;
  fontSizeHeight: number;
  cutoff: number;
  fontFamily: string;
  fontWeight: string;
  radius: number;
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  gridOuter: Float64Array;
  gridInner: Float64Array;
  f: Float64Array;
  z: Float64Array;
  v: Uint16Array;
  middle: number;

  constructor(
    fontSize?: number,
    radius?: number,
    cutoff?: number,
    fontFamily?: string,
    fontWeight?: string
  ) {
    this.fontSize = fontSize || 24;
    this.fontSizeHeight = Math.ceil(this.fontSize * getLetterHeight());
    this.cutoff = cutoff || 0.5;
    this.fontFamily = fontFamily || "sans-serif";
    this.fontWeight = fontWeight || "normal";
    this.radius = radius || SDF_RADIUS;

    this.canvas = document.createElement("canvas");
    this.canvas.width = this.fontSize;
    this.canvas.height = this.fontSizeHeight;
    // document.body.appendChild(this.canvas);

    this.ctx = this.canvas.getContext("2d");
    this.ctx.font =
      this.fontWeight + " " + this.fontSize + "px " + this.fontFamily;
    this.ctx.fillStyle = "black";
    this.ctx.textBaseline = "top";
    // console.log("TinySDF font", this.ctx.font, this.ctx.fillStyle);

    // temporary arrays for the distance transform
    this.gridOuter = new Float64Array(this.fontSize * this.fontSizeHeight);
    this.gridInner = new Float64Array(this.fontSize * this.fontSizeHeight);
    this.f = new Float64Array(this.fontSizeHeight);
    this.z = new Float64Array(this.fontSizeHeight + 1);
    this.v = new Uint16Array(this.fontSizeHeight);

    // hack around https://bugzilla.mozilla.org/show_bug.cgi?id=737852
    this.middle = Math.round(
      (this.fontSizeHeight / 2) *
        (navigator.userAgent.indexOf("Gecko/") >= 0 ? 1.2 : 1)
    );
  }

  createImageData(ctx: CanvasRenderingContext2D): ImageData {
    return ctx.createImageData(this.fontSize, this.fontSizeHeight);
  }

  draw(char: string): Uint8ClampedArray {
    this.ctx.clearRect(0, 0, this.fontSize, this.fontSizeHeight);
    const metrics = this.ctx.measureText(char);
    this.ctx.fillText(char, 0, this.radius + metrics.actualBoundingBoxAscent);

    // console.log("TinySDF metrics 1: " + this.fontSizeHeight);
    const imgData = this.ctx.getImageData(
      0,
      0,
      this.fontSize,
      this.fontSizeHeight
    );
    // console.log("TinySDF metrics 2");
    const alphaChannel = new Uint8ClampedArray(
      4 * this.fontSize * this.fontSizeHeight
    );
    // console.log("TinySDF metrics 3");

    for (let i = 0; i < this.fontSize * this.fontSizeHeight; i++) {
      const a = imgData.data[i * 4 + 3] / 255; // alpha value
      this.gridOuter[i] =
        a === 1 ? 0 : a === 0 ? INF : Math.pow(Math.max(0, 0.5 - a), 2);
      this.gridInner[i] =
        a === 1 ? INF : a === 0 ? 0 : Math.pow(Math.max(0, a - 0.5), 2);
    }

    this.edt(this.gridOuter);
    this.edt(this.gridInner);

    for (let i = 0; i < this.fontSize * this.fontSizeHeight; i++) {
      const d = Math.sqrt(this.gridOuter[i]) - Math.sqrt(this.gridInner[i]);
      alphaChannel[i * 4 + 3] = Math.round(
        255 - 255 * (d / this.radius + this.cutoff)
      );
      // alphaChannel[i*4 + 2] = alphaChannel[i*4 + 3];
      // alphaChannel[i*4 + 1] = alphaChannel[i*4 + 3];
      // alphaChannel[i*4 + 0] = alphaChannel[i*4 + 3];
      // alphaChannel[i*4 + 3] = 255;
      // console.log(alphaChannel[i*4 + 3]);
    }

    return alphaChannel;
  }

  // 2D Euclidean squared distance transform by Felzenszwalb & Huttenlocher https://cs.brown.edu/~pff/papers/dt-final.pdf
  edt(grid: Float64Array) {
    const width = this.fontSize;
    const height = this.fontSizeHeight;
    for (let x = 0; x < width; x++) {
      this.edt1d(grid, x, width, height);
    }
    for (let y = 0; y < height; y++) {
      this.edt1d(grid, y * width, 1, width);
    }
  }

  // 1D squared distance transform
  edt1d(grid: Float64Array, offset: number, stride: number, length: number) {
    // this.f = new Float64Array(this.fontSizeHeight);
    // this.z = new Float64Array(this.fontSizeHeight + 1);
    // this.v = new Uint16Array(this.fontSizeHeight);
    const scanline = this.f;
    const v = this.v;
    const z = this.z;
    let q;
    let k;
    let s;
    let r;
    v[0] = 0;
    z[0] = -INF;
    z[1] = INF;

    for (q = 0; q < length; q++) {
      scanline[q] = grid[offset + q * stride];
    }

    for (q = 1, k = 0, s = 0; q < length; q++) {
      do {
        r = v[k];
        s = (scanline[q] - scanline[r] + q * q - r * r) / (q - r) / 2;
      } while (s <= z[k] && --k > -1);

      k++;
      v[k] = q;
      z[k] = s;
      z[k + 1] = INF;
    }

    for (q = 0, k = 0; q < length; q++) {
      while (z[k + 1] < q) {
        k++;
      }
      r = v[k];
      grid[offset + q * stride] = scanline[r] + (q - r) * (q - r);
    }
  }
}
