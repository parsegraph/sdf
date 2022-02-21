var assert = require("assert");
import TinySDF from "../src/index";

describe("Package", function () {
  it("works", () => {
    const sdf = new TinySDF(18, 6, 1);
    assert.ok(sdf.draw("Hello"));
  });
});
