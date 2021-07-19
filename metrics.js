const deaths = require('./deaths');
const cases = require('./cases');
const swabs = require('./swabs');
const vaccinations = require('./vaccinations');
const hospitalisations = require('./hospitalisations');

const metrics = {
    cases: cases,
    deaths: deaths,
    swabs: swabs,
    vaccinations: vaccinations,
    hospitalisations: hospitalisations
};

exports.metrics = metrics;
