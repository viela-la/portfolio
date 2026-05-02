import { fetchJSON, renderProjects } from '../global.js';
const projects = await fetchJSON('../lib/projects.json');

const projectsContainer = document.querySelector('.projects');

renderProjects(projects, projectsContainer, 'h2');

const titleElement = document.querySelector('.projects-title');
titleElement.textContent = `${projects.length} Projects`;

import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm';
// let arcGenerator = d3.arc().innerRadius(0).outerRadius(50);

// let rolledData = d3.rollups(
//     projects,
//     (v) => v.length,
//     (d) => d.year,
// );
// let data = rolledData.map(([year, count]) => {
//     return {value: count, label: year};
// });
// let total = 0;
// for (let d of data){
//     total += d;
// }
// let sliceGenerator = d3.pie().value((d) => d.value);
// let angle = 0;
// let arcData = sliceGenerator(data);
// let colors = d3.scaleOrdinal(d3.schemeTableau10);

// for (let d of data) {
//   let endAngle = angle + (d / total) * 2 * Math.PI;
//   arcData.push({ startAngle: angle, endAngle });
//   angle = endAngle;
// }
// let arcs = arcData.map((d) => arcGenerator(d));
// arcs.forEach((arc, idx) => {
//     d3.select('svg').append('path').attr('d', arc).attr('fill', colors(idx))
// });

// let legend = d3.select('.legend')
// data.forEach((d, idx) => {
//   legend
//     .append('li')
//     .attr('style', `--color:${colors(idx)}`) // set the style attribute while passing in parameters
//     .html(`<span class="swatch"></span> ${d.label} <em>(${d.value})</em>`); // set the inner html of <li>
// });

let query = '';
let selectedYear = null;
let searchInput = document.querySelector('.searchBar');

function getFilteredProjects() {
  return projects.filter(p => {
    let matchesSearch =
      p.title.toLowerCase().includes(query) ||
      p.description.toLowerCase().includes(query);

    let matchesYear =
      !selectedYear || p.year == selectedYear;

    return matchesSearch && matchesYear;
  });
}

function renderPieChart(projectsGiven) {
    let arcGenerator = d3.arc().innerRadius(0).outerRadius(50);
  // re-calculate rolled data
  let newRolledData = d3.rollups(
    projectsGiven,
    (v) => v.length,
    (d) => d.year,
  );
  // re-calculate data
  let newData = newRolledData.map(([year, count]) => {
    return {value: count, label: year}; 
  });
  // re-calculate slice generator, arc data, arc, etc.
  let newSliceGenerator = d3.pie().value(d => d.value);

  let newArcData = newSliceGenerator(newData);
  
  let newColors = d3.scaleOrdinal(d3.schemeTableau10);

  let newSVG = d3.select('svg');
  let newLegend = d3.select('.legend');

  newSVG.selectAll('path').remove();
  newLegend.selectAll('*').remove();

  newSVG.selectAll('path')
    .data(newArcData)
    .join('path')
    .attr('d', arcGenerator)
    .attr('fill', (d, i) => newColors(i))
    .on('click', (event, d) => {
        let year = d.data.label;
        selectedYear = selectedYear === year ? null : year;
        
        let filtered = getFilteredProjects();

        newSVG.selectAll('path')
        .attr('class', p =>
          selectedYear && p.data.label === selectedYear ? 'selected' : null
        );

        newLegend.selectAll('li')
        .attr('class', p =>
          selectedYear && p.label === selectedYear ? 'selected' : null
        );

        renderProjects(filtered, projectsContainer, 'h2');
    })
    ;

  // Build legend
  newLegend.selectAll('li')
    .data(newData)
    .join('li')
    .style('--color', (d, i) => newColors(i))
    .html(d => `<span class="swatch"></span> ${d.label} <em>(${d.value})</em>`);
}

// Call this function on page load
renderPieChart(projects);

searchInput.addEventListener('input', (event) => {
  query = event.target.value.trim().toLowerCase();
  // filter projects
  let filtered = getFilteredProjects();

  // re-render legends and pie chart when event triggers
  renderProjects(filtered, projectsContainer, 'h2');
  renderPieChart(filtered);
});
