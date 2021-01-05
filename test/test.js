var assert = require("assert");
import TinySDF from "../dist/sdf";

describe("Package", function () {
  it("works", ()=>{
    const sdf = new TinySDF();
    assert.ok(sdf.draw("Hello"));
  });
});
