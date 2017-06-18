const tape = require('tape'),
  parse = require('../').parse;

tape('Parser parses Vega specs with axes', function (test) {
  const spec = {
    "scales": [
      {
        "name": "xscale",
        "domain": [0, 1],
        "range": [0, 500]
      }
    ],
    "axes": [
      {
        "scale": "xscale",
        "orient": "bottom"
      }
    ]
  };

  const dfs = parse(spec);

  test.equal(dfs.operators.length, 44);

  test.end();
});
