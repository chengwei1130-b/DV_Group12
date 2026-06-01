const xScale = d3.scaleBand()
    .padding(0.2);

const colorScale = d3.scaleOrdinal();

const yScale = d3.scaleLinear()

const defineScales = (data) => {
    xScale
        .domain(data.map(d => d.year))
        .range([0, innerWidth]);

    yScale
        .domain([0, 1])
        .range([innerHeight, 0])
        .nice();

    colorScale
        .domain(formatsInfo.map(f => f.id))
        .range(formatsInfo.map(f => f.color));
};


