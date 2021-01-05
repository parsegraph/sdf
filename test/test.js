var assert = require("assert");
import todo from "../dist/sdf";

describe("Package", function () {
  it("works", ()=>{
    assert.equal(todo(), 42);
  });
});
