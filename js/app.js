// fetch data and init
Promise
    .all([d3.csv('/data/sojs18.csv'), d3.json('/data/world-110m2.json')])
    .then(([surveyAnswers, world]) => {
        const answers = surveyAnswers
            .map(answer => { // map interesting values
                const size = answer.about_you_company_size;
                return {
                    country: normalizeCountry(answer.about_you_your_country) || '~null',
                    city: answer.about_you_your_city,
                    salary: answer.about_you_yearly_salary || null,
                    gender: answer.about_you_your_gender || null,
                    companySize: size && (size.endsWith(' people') // remove people
                        ? size.slice(0, -' people'.length)
                        : size) || null,
                };
            });
        return { answers, world }
    })
    .then(({ answers, world }) => {
        const ndx = crossfilter(answers);
        const rangeColors = ["#E2F2FF", "#C4E4FF", "#9ED2FF", "#81C5FF", "#6BBAFF", "#51AEFF", "#36A2FF", "#1E96FF", "#0089FF", "#0061B5"];

        // ----- Data count
        const dataCount = dc.dataCount('#data-count');

        dataCount
            .dimension(ndx)
            .group(ndx.groupAll());

        // ----- World Map
        var worldMap = dc.geoChoroplethChart("#chart-map");

        const countryDim = ndx.dimension(answer => answer.country);

        const countryGroup = countryDim.group().reduceCount(answer => answer.country);

        worldMap
            .width(d3.select('#chart-map').node().parentElement.clientWidth)
            .height(500)
            .dimension(countryDim)
            .group(countryGroup)
            .colors(d3.scaleQuantize().range(rangeColors))
            .colorDomain([0, 900])
            .colorCalculator(d => d ? worldMap.colors()(d) : '#ccc') // .colorAccessor(d => { return worldMap.colors()(d) ? d : '#ccc' })
            .overlayGeoJson(topojson.feature(world, world.objects.countries).features, 'country', d => normalizeCountryByISOCode[d.id] || '')
            .projection(
                d3.geoMercator()
                    .center([0, 20])
                    .scale(150)
                    .rotate([0, 0])
            )
            .valueAccessor(d => d.value);

        // ----- Gender pie chart
        const genderPie = dc.pieChart('#chart-gender');

        const genderDim = ndx.dimension(answer => answer.gender);
        const genderGroup = genderDim.group().reduceCount();

        genderPie
            .width(150)
            .height(150)
            .dimension(genderDim)
            .group(genderGroup)
            .innerRadius(20);

        // ----- Salary bar chart
        const salaryBar = dc.barChart('#chart-salary');

        const salaryDim = ndx.dimension(answer => answer.salary);
        const salaryGroup = salaryDim.group().reduceCount();

        salaryBar
            .width(d3.select('#chart-salary').node().parentElement.clientWidth)
            .height(180)
            .dimension(salaryDim)
            .group(salaryGroup)
            .x(d3.scaleOrdinal().domain(['I work for free :(', '$0-$10k', '$10k-$30k', '$30k-$50k', '$50k-$100k', '$100k-$200k', '$200k+']))
            .xUnits(dc.units.ordinal)
            .brushOn(false)
            .yAxisLabel('Answers')
            .elasticY(true)
            .barPadding(0.1)
            .outerPadding(0.05)
            .margins({ top: 10, right: 20, bottom: 45, left: 55 });

        // ----- Company Size bar chart
        const companySizeBar = dc.barChart('#chart-company-size');

        const companySizeDim = ndx.dimension(answer => answer.companySize);
        const companySizeGroup = companySizeDim.group().reduceCount();

        companySizeBar
            .width(d3.select('#chart-company-size').node().parentElement.clientWidth)
            .height(180)
            .dimension(companySizeDim)
            .group(companySizeGroup)
            .x(d3.scaleOrdinal().domain(['Just me', '1-5', '5-10', '10-20', '20-50', '50-100', '100-1000', '1000+']))
            .xUnits(dc.units.ordinal)
            .brushOn(false)
            .yAxisLabel('Answers')
            .elasticY(true)
            .barPadding(0.1)
            .outerPadding(0.05)
            .margins({ top: 10, right: 20, bottom: 45, left: 55 });

        // ----- Data table
        const allDim = ndx.dimension(answer => answer.country);
        const dataTableGroup = function (d) { return ''; };

        const dataTable = dc.dataTable('#data-table');

        dataTable
            .dimension(allDim)
            .group(dataTableGroup)
            .size(20)
            .columns([
                answer => answer.country,
                answer => answer.city,
                answer => answer.salary,
                answer => answer.gender,
                answer => answer.companySize,
            ])
            .sortBy(answer => answer.country)
            .order(d3.ascending)
            .on('renderlet', function (table) {
                // each time table is rendered remove nasty extra row dc.js insists on adding
                table.select('tr.dc-table-group').remove();
            });

        // ----- Reset filters
        d3.selectAll('a#reset-filters').on('click', function () {
            dc.filterAll();
            dc.renderAll();
        });

        // ----- Render all
        dc.renderAll();
    });

// // D3 world map
// const worldMap = d3.select('#chart-map');

// const svgMap = worldMap.append('svg')
//     .attr('width', worldMap.node().clientWidth)
//     .attr('height', 500);

// const countryDim = ndx.dimension(answer => answer.country);

// const projection = d3.geoMercator()
//     .center([0, 20])
//     .scale(150)
//     .rotate([0, 0]);

// const path = d3.geoPath()
//     .projection(projection);

// const gWorld = svgMap.append('g');

// let selectedCountries = [];

// gWorld.selectAll('path')
//     .data(topojson.feature(world, world.objects.countries).features)
//     .enter()
//     .append('path')
//     .attr("class", d => 'country ' + (normalizeCountryByISOCode[d.id] ? 'with-data' : 'no-data'))
//     .attr('d', path)
//     .on('click', function (d) {
//         const country = normalizeCountryByISOCode[d.id];
//         if (!country) return;
//         selectedCountries = selectedCountries.includes(country)
//             ? selectedCountries.filter(c => c !== country)
//             : selectedCountries.concat([country]);
//         d3.select(this).classed('selected', selectedCountries.includes(country));
//         countryDim.filter(country => selectedCountries.length ? selectedCountries.includes(country) : true);
//         dc.renderAll();
//     });