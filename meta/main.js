import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm';
import scrollama from 'https://cdn.jsdelivr.net/npm/scrollama@3.2.0/+esm';


async function loadData() {
  const data = await d3.csv('loc.csv', (row) => ({
    ...row,
    line: Number(row.line), // or just +row.line
    depth: Number(row.depth),
    length: Number(row.length),
    date: new Date(row.date + 'T00:00' + row.timezone),
    datetime: new Date(row.datetime),
  }));

  return data;
}

function processCommits(data) {
  return d3
    .groups(data, (d) => d.commit)
    .map(([commit, lines]) => {
      let first = lines[0];
      let { author, date, time, timezone, datetime } = first;
      let ret = {
        id: commit,
        url: 'https://github.com/vis-society/lab-7/commit/' + commit,
        author,
        date,
        time,
        timezone,
        datetime,
        hourFrac: datetime.getHours() + datetime.getMinutes() / 60,
        totalLines: lines.length,
      };

      Object.defineProperty(ret, 'lines', {
        value: lines,
        // What other options do we need to set?
        // Hint: look up configurable, writable, and enumerable
        configurable: true,
        enumerable: true,
        writable: true
      });

      return ret;
    });
}

// let data = await loadData();
// let commits = processCommits(data);
// console.log(commits);

function renderCommitInfo(data, commits) {
  // Create the dl element
  const dl = d3.select('#stats').append('dl').attr('class', 'stats-grid');

  // Add total LOC
  dl.append('dt').html('Total <abbr title="Lines of code">LOC</abbr>');
  dl.append('dd').text(data.length);

  // Add total commits
  dl.append('dt').text('Total commits');
  dl.append('dd').text(commits.length);

  // Add more stats as needed...
  dl.append('dt').text('Avg. Line Length');
  const lineLength = d3.mean(data, d => d.length);
  dl.append('dd').text(lineLength.toFixed(2));

  dl.append('dt').text('Days on Site');
  const workDays = d3.group(data, d => d.datetime).size;
  dl.append('dd').text(workDays);

  dl.append('dt').text('Most Productive Hour');
  const workByPeriod = d3.rollups(
  data,
  (v) => v.length,
  (d) => new Date(d.datetime).toLocaleString('en', { dayPeriod: 'short' }),
);
    const maxPeriod = d3.greatest(workByPeriod, (d) => d[1])?.[0];
    dl.append('dd').text(maxPeriod);
}

function renderTooltipContent(commit) {
  const link = document.getElementById('commit-link');
  const date = document.getElementById('commit-date');
  const time = document.getElementById('commit-time');
  const author = document.getElementById('commit-author');
  const edits = document.getElementById('commit-edits');

  if (Object.keys(commit).length === 0) return;

  link.href = commit.url;
  link.textContent = commit.id;
  date.textContent = commit.datetime?.toLocaleString('en', {
    dateStyle: 'full',
  });
  time.textContent = commit.datetime?.toLocaleString('en', {timeStyle: 'short'})
  author.textContent = commit.author;
  edits.textContent = commit.totalLines;
}

function updateTooltipVisibility(isVisible) {
  const tooltip = document.getElementById('commit-tooltip');
  tooltip.hidden = !isVisible;
}
function updateTooltipPosition(event) {
  const tooltip = document.getElementById('commit-tooltip');
  tooltip.style.left = `${event.clientX}px`;
  tooltip.style.top = `${event.clientY}px`;
}
function createBrushSelector(svg) {
    const brush = (d3.brush()).on('start brush end', brushed);
    svg.call(brush);
    svg.selectAll('.dots, .overlay ~ *').raise();
}

function isCommitSelected(selection, commit) {
  if (!selection) {
    return false;
  }
  const [x0, x1] = selection.map((d) => d[0]);
  const [y0, y1] = selection.map((d) => d[1]);
  const x = xScale(commit.datetime);
  const y = yScale(commit.hourFrac);
  return x >= x0 && x <= x1 && y >= y0 && y <= y1;
}
function renderSelectionCount(selection) {
  const selectedCommits = selection
    ? commits.filter((d) => isCommitSelected(selection, d))
    : [];

  const countElement = document.querySelector('#selection-count');
  countElement.textContent = `${
    selectedCommits.length || 'No'
  } commits selected`;

  return selectedCommits;
}

function brushed(event) {
  const selection = event.selection;
  d3.selectAll('circle').classed('selected', (d) =>
    isCommitSelected(selection, d),
  );
  renderSelectionCount(selection);
  renderLanguageBreakdown(selection);
}

function renderLanguageBreakdown(selection) {
  const selectedCommits = selection
    ? commits.filter((d) => isCommitSelected(selection, d))
    : [];
  const container = document.getElementById('language-breakdown');

  if (selectedCommits.length === 0) {
    container.innerHTML = '';
    return;
  }
  const requiredCommits = selectedCommits.length ? selectedCommits : commits;
  const lines = requiredCommits.flatMap((d) => d.lines);

  // Use d3.rollup to count lines per language
  const breakdown = d3.rollup(
    lines,
    (v) => v.length,
    (d) => d.type,
  );

  // Update DOM with breakdown
  container.innerHTML = '';

  for (const [language, count] of breakdown) {
    const proportion = count / lines.length;
    const formatted = d3.format('.1~%')(proportion);

    container.innerHTML += `
            <dt>${language}</dt>
            <dd>${count} lines (${formatted})</dd>
        `;
  }
}


let xScale;
let yScale;

function renderScatterPlot(data, commits) {
  const width = 1000;
  const height = 600;
  
  const margin = { top: 10, right: 10, bottom: 30, left: 20 };

  const usableArea = {
  top: margin.top,
  right: width - margin.right,
  bottom: height - margin.bottom,
  left: margin.left,
  width: width - margin.left - margin.right,
  height: height - margin.top - margin.bottom,
};

  const svg = d3
  .select('#chart')
  .append('svg')
  .attr('viewBox', `0 0 ${width} ${height}`)
  .style('overflow', 'visible');

  xScale = d3
  .scaleTime()
  .domain(d3.extent(commits, (d) => d.datetime))
  .range([usableArea.left, usableArea.right])
  .nice();
  
  yScale = d3.scaleLinear().domain([0, 24]).range([usableArea.bottom, usableArea.top]);

  const gridlines = svg
  .append('g')
  .attr('class', 'gridlines')
  .attr('transform', `translate(${usableArea.left}, 0)`);


 gridlines.call(d3.axisLeft(yScale).tickFormat('').tickSize(-usableArea.width));


  const dots = svg.append('g').attr('class', 'dots');
  const [minLines, maxLines] = d3.extent(commits, (d) => d.totalLines);
  const rScale = d3.scaleSqrt().domain([minLines, maxLines]).range([2, 30]);
  const sortedCommits = d3.sort(commits, (d) => -d.totalLines);

dots
  .selectAll('circle')
  .data(sortedCommits, (d) => d.id)
  .join('circle')
  .attr('cx', (d) => xScale(d.datetime))
  .attr('cy', (d) => yScale(d.hourFrac))
  .attr('fill', '#ee87bc')
  .attr('r', (d) => rScale(d.totalLines))
  .style('fill-opacity', 0.7)
   .on('mouseenter', (event, commit) => {
    d3.select(event.currentTarget).style('fill-opacity', 1)
    renderTooltipContent(commit);
    updateTooltipVisibility(true);
    updateTooltipPosition(event);

  })
  .on('mouseleave', (event) => {
    d3.select(event.currentTarget).style('fill-opacity', 0.7);
    updateTooltipVisibility(false);

  });

const xAxis = d3.axisBottom(xScale);
const yAxis = d3.axisLeft(yScale);

svg
  .append('g')
  .attr('transform', `translate(0, ${usableArea.bottom})`)
  .attr('class', 'x-axis')
  .call(xAxis);

svg
  .append('g')
  .attr('transform', `translate(${usableArea.left}, 0)`)
  .attr('class', 'y-axis')
  .call(yAxis);

  createBrushSelector(svg);

}

function updateScatterPlot(data, commits) {
  const width = 1000;
  const height = 600;
  const margin = { top: 10, right: 10, bottom: 30, left: 20 };
  const usableArea = {
    top: margin.top,
    right: width - margin.right,
    bottom: height - margin.bottom,
    left: margin.left,
    width: width - margin.left - margin.right,
    height: height - margin.top - margin.bottom,
  };

  const svg = d3.select('#chart').select('svg');

  xScale.domain(d3.extent(commits, (d) => d.datetime));

  const xAxis = d3.axisBottom(xScale);

  const xAxisGroup = svg.select('g.x-axis');
  xAxisGroup.call(xAxis);

  const [minLines, maxLines] = d3.extent(commits, (d) => d.totalLines);
  
  const rScale = d3.scaleSqrt().domain([minLines, maxLines]).range([2, 30]);

  const dots = svg.select('g.dots');

  const sortedCommits = d3.sort(commits, (d) => -d.totalLines);
  dots
    .selectAll('circle')
    .data(sortedCommits, (d) => d.id)
    .join('circle')
    .attr('cx', (d) => xScale(d.datetime))
    .attr('cy', (d) => yScale(d.hourFrac))
    .attr('r', (d) => rScale(d.totalLines))
    .attr('fill', '#ee87bc')
    .style('fill-opacity', 0.7) // Add transparency for overlapping dots
    .on('mouseenter', (event, commit) => {
      d3.select(event.currentTarget).style('fill-opacity', 1); // Full opacity on hover
      renderTooltipContent(commit);
      updateTooltipVisibility(true);
      updateTooltipPosition(event);
    })
    .on('mouseleave', (event) => {
      d3.select(event.currentTarget).style('fill-opacity', 0.7);
      updateTooltipVisibility(false);
    });
}


let data = await loadData();
let commits = processCommits(data);
commits = d3.sort(commits, d=>d.datetime);

renderCommitInfo(data, commits);
renderScatterPlot(data, commits);

let commitProgress = 100;
let timeScale = d3
  .scaleTime()
  .domain([
    d3.min(commits, (d) => d.datetime),
    d3.max(commits, (d) => d.datetime),
  ])
  .range([0, 100]);
let commitMaxTime = timeScale.invert(commitProgress);

const timeSlider = document.getElementById('commit-progress');
const commitTime = document.getElementById('slider-commit-time');

let filteredCommits = commits;

function updateFileDisplay(filteredCommits) {
let lines = filteredCommits.flatMap((d) => d.lines);
let files = d3.groups(lines, (d) => d.file).map(([name, lines]) => {
  return {name, lines};
});
let filesContainer = d3
  .select('#files')
  .selectAll('.file-entry')
  .data(files, (d) => d.name)
  .join(
    // This code only runs when the div is initially rendered
    (enter) => {
      const div = enter
        .append('div')
        .attr('class', 'file-entry');
      const meta = div
        .append('div')
        .attr('class', 'file-meta');
    meta.append('dt').append('code');
    meta.append('dd').attr('class', 'file-lines');

    div.append('div').attr('class', 'file-dots');
    return div;
      // enter.append('div').call((div) => {
      //   div.append('dt').append('code');
      //   div.append('dd');
      // }),
}
  );

// This code updates the div info
filesContainer.select('dt code').text((d) => d.name);
filesContainer.select('.file-lines').text((d) => `${d.lines.length} lines`);

let colors = d3.scaleOrdinal(d3.schemeTableau10);
filesContainer
  .select('.file-dots')
  .selectAll('div')
  .data((d) => d.lines)
  .join('div')
  .attr('class', 'loc')
  .attr('style', (d) => `--color: ${colors(d.type)}`)
  ;

};

function onTimeSliderChange() {
  commitProgress = Number(timeSlider.value);
  commitMaxTime = timeScale.invert(commitProgress);
  commitTime.textContent = commitMaxTime.toLocaleString('en-US', {dateStyle:'long', timeStyle:'short'});

  filteredCommits = commits.filter((d) => d.datetime <= commitMaxTime);
  updateScatterPlot(data, filteredCommits);
  updateFileDisplay(filteredCommits);
}
// timeSlider.addEventListener(
//   'input',
//   onTimeSliderChange
// );
// onTimeSliderChange();

d3.select('#scatter-story')
  .selectAll('.step')
  .data(commits)
  .join('div')
  .attr('class', 'step')
  .html(
    (d, i) => `
		On ${d.datetime.toLocaleString('en', {
      dateStyle: 'full',
      timeStyle: 'short',
    })},
		I made <a href="${d.url}" target="_blank">${
      i > 0 ? 'another glorious commit' : 'my first commit, and it was glorious'
    }</a>.
		I edited ${d.totalLines} lines across ${
      d3.rollups(
        d.lines,
        (D) => D.length,
        (d) => d.file,
      ).length
    } files.
		Then I looked over all I had made, and I saw that it was very good.
	`,
  );
function onStepEnter(response) {
  const commit = response.element.__data__;

  // Filter commits up to this commit's time
  const visibleCommits = commits.filter(
    d => d.datetime <= commit.datetime
  );

  // Update scatter plot
  updateScatterPlot(data, visibleCommits);

  // Update displayed date
  d3.select('#commit-time')
    .text(
      commit.datetime.toLocaleString('en-US', {
        dateStyle: 'long',
        timeStyle: 'short',
      })
    );
}

const scroller = scrollama();
scroller
  .setup({
    container: '#scrolly-1',
    step: '#scrolly-1 .step',
  })
  .onStepEnter(onStepEnter);

d3.select('#files-steps')
  .selectAll('.step')
  .data(commits)
  .join('div')
  .attr('class', 'step');

  function onFileStepEnter(response) {
  const commit = response.element.__data__;

  const visibleCommits = commits.filter(
    d => d.datetime <= commit.datetime
  );

  updateFileDisplay(visibleCommits);
}

const fileScroller = scrollama();

fileScroller
  .setup({
    container: '#scrolly-files',
    step: '#scrolly-files .step',
  })
  .onStepEnter(onFileStepEnter);