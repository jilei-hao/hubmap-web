/*
  ==========================================================================================
    HuBMAP Web
    v1.0
    
  ==========================================================================================
*/

import './main.css'

import '@kitware/vtk.js/Rendering/Profiles/All';

//import vtkPolyDataReader from '@kitware/vtk.js/IO/Legacy/PolyDataReader';
import vtkFullScreenRenderWindow from '@kitware/vtk.js/Rendering/Misc/FullScreenRenderWindow';

import vtkHttpSceneLoader from '@kitware/vtk.js/IO/Core/HttpSceneLoader';
import vtkHttpDataAccessHelper from '@kitware/vtk.js/IO/Core/DataAccessHelper/HttpDataAccessHelper';
import vtkDataAccessHelper from '@kitware/vtk.js/IO/Core/DataAccessHelper';


import vtkLabelWidget from '@kitware/vtk.js/Widgets/Widgets3D/LabelWidget';
//import vtkWidgetManager from '@kitware/vtk.js/Widgets/Core/WidgetManager';
import vtkActor from '@kitware/vtk.js/Rendering/Core/Actor';
import vtkMapper from '@kitware/vtk.js/Rendering/Core/Mapper';
//import vtkSTLWriter from '@kitware/vtk.js/IO/Geometry/STLWriter';
import vtkLineSource from '@kitware/vtk.js/Filters/Sources/LineSource';
//import vtkXMLPolyDataReader from '@kitware/vtk.js/IO/XML/XMLPolyDataReader';
import vtkPlaneSource from '@kitware/vtk.js/Filters/Sources/PlaneSource';

// Force DataAccessHelper to have access to various data source
import '@kitware/vtk.js/IO/Core/DataAccessHelper/HtmlDataAccessHelper';
import '@kitware/vtk.js/IO/Core/DataAccessHelper/HttpDataAccessHelper';
import '@kitware/vtk.js/IO/Core/DataAccessHelper/JSZipDataAccessHelper';

import { Representation } from '@kitware/vtk.js/Rendering/Core/Property/Constants';
import vtkWidgetManager from '@kitware/vtk.js/Widgets/Core/WidgetManager';

// ----------------------------------------------------------------------------
// Standard rendering code setup
// ----------------------------------------------------------------------------

const fullScreenRenderer = vtkFullScreenRenderWindow.newInstance();
const renderer = fullScreenRenderer.getRenderer();
const renderWindow = fullScreenRenderer.getRenderWindow();

const widgetManager = vtkWidgetManager.newInstance();
widgetManager.setRenderer(renderer);
widgetManager.disablePicking();
global.widgetManager = widgetManager;

// ----------------------------------------------------------------------------
// Create Axes
// ----------------------------------------------------------------------------

function createLine(p1, p2) {
  const lineSource = vtkLineSource.newInstance();
  const actor = vtkActor.newInstance();
  const mapper = vtkMapper.newInstance();

  actor.setMapper(mapper);
  actor.getProperty().setEdgeVisibility(true);
  actor.getProperty().setEdgeColor(0, 0, 0);

  lineSource.setPoint1(p1);
  lineSource.setPoint2(p2);

  mapper.setInputConnection(lineSource.getOutputPort());

  renderer.addActor(actor);
  return { lineSource, mapper, actor };
}

// Set the lengths of an axis
// Inputs:
//    axisInd: the index in the axes array of the axis
//    len: the length to be set
function getAxisPos(axisInd, len) {
  /*
    - Axes on screen and in the app are identified by index 0, 1, 2
      in the Axes array
    - Axis 0 represents the 45 degree axis pointing from inferior-anterior to 
      superior-posterior
        - Start: SUP (Superior) [len/2.828, 0, -len/2.828]
        - End: INF (Inferior) [-len/2.828, 0, len/2.828]
    - Axis 1 represents the 45 degree axis pointing from inferior-posterior to 
      superior-anterior
        - Start: ANTI-MES (Anti-Mesenteric) [0, -len/2.828), -len/2.828]
        - End: MES (Mensenteric) [0, len/2.828, len/2.828]
    - Axis 2 represents the longest axis in the ovary model 
        - Start: UOL (Utero-ovarian Ligament) [0, -len/2, 0]
        - End: IL (Infundibulopelvic Ligament) [0, -len/2, 0]
  */

  console.assert(axisInd >= 0 && axisInd < 3);

  let p1 = [0, 0, 0];
  let p2 = [0, 0, 0];

  if (axisInd == 0) {
    p1 = [-len/2.828, -len/2.828, 0];
    p2 = [len/2.828, len/2.828, 0 ];
  } else if (axisInd == 1) {
    p1 = [len/2.828, -len/2.828, 0];
    p2 = [-len/2.828, len/2.828, 0];
  } else { // axisInd == 2
    p1 = [0, 0, -len/1.7];
    p2 = [0, 0, len/1.7];
  }

  return [p1, p2];
}

function createLabelDesc (shortDesc, fullDesc) {
  return { short: shortDesc, full: fullDesc };
}

// Create orientation text
function createLabel(desc, position) {
  const wdgLabel = vtkLabelWidget.newInstance();
  const handle = widgetManager.addWidget(wdgLabel);
  widgetManager.releaseFocus(wdgLabel);
  global.handles.push(handle);
  global.labels.push(wdgLabel);

  //console.log(handle);
  //handle.setInteractor(renderWindow.getInteractor());
  //handle.setEnabled(true);
  //handle.setHandleVisibility(true);
  //handle.setText(desc.short);
  //handle.setDragable(false);
  //handle.setCoordinateSystemToWorld();

  //global.handles.push(widget);
  
  //handle.setWorldPosition(position);

  return wdgLabel;
}

function createAxes(w, h, d) {
  const l45 = Math.max(h, d) * 1.25;
  let pos = [
    getAxisPos(0, l45), 
    getAxisPos(1, l45),
    getAxisPos(2, w)
  ];

  let axes = [];
  let actors = [];

  // if axes don't exist, create them
  for (let i = 0; i < 3; ++i) {
    axes[i] = {
      Line: createLine(pos[i][0], pos[i][1]),
      StartLabel: createLabel(AxesLabels[i][0], pos[i][0]),
      EndLabel: createLabel(AxesLabels[i][1], pos[i][1])
    }
  }

  return actors;
}

const AxesLabels = [
  [
    createLabelDesc('Utero-Ovarian\n Ligament', 'Utero-Ovarian Ligament'), 
    createLabelDesc('Infundibulopelvic Ligament', 'Infundibulopelvic Ligament')
  ], 
  [
    createLabelDesc('Anti-Mesenteric', 'Anti-Mesenteric'), 
    createLabelDesc('Mensenteric', 'Mensenteric')
  ],
  [
    createLabelDesc('Inferior', 'Inferior'), 
    createLabelDesc('Superior', 'Superior')
  ]
];

// ----------------------------------------------------------------------------
// Mesovarium Plane Logic
// ----------------------------------------------------------------------------
function createPlane(w, h, d) {
  const maxdh = Math.max(d, h);
  const outEdge = 0.7 * 0.5 * maxdh;
  const pos = [
    [0, 0, -0.5 * w], // origin
    [-outEdge, outEdge, -0.5 * w], //p1
    [0, 0, 0.5 * w] // p2
  ];

  const ps = vtkPlaneSource.newInstance();
  ps.setOrigin(pos[0]);
  ps.setPoint1(pos[1]);
  ps.setPoint2(pos[2]);

  // Mapper
  const mapper = vtkMapper.newInstance();
  const actor = vtkActor.newInstance();

  // Configure plane apperance
  actor.getProperty().setColor(180, 180, 180);
  actor.getProperty().setOpacity(0.5);  
  actor.getProperty().setRepresentation(Representation.SURFACE);

  mapper.setInputConnection(ps.getOutputPort());
  actor.setMapper(mapper);
  renderer.addActor(actor);

  return actor;
}

// initialize camera
function initializeCamera(camera) {
  camera.setPosition(-100, 0, 0);
  camera.setFocalPoint(0, 0, 0);
}


// render default mesh when opening page
window.addEventListener('load', () => {
  document.getElementById('Create').click();
});

// ------------------------------------------
// UI control handling
// ------------------------------------------

// Control Panel html
const controlPanel = `<table>
    <tr>
      <td>
        <label>Representation</label>
      </td>
      <td>
        <select class="representations" style="width: 100%">
          <option value="0">Points</option>
          <option value="1">Wireframe</option>
          <option value="2" selected>Surface</option>
        </select>
      </td>
    </tr>
    <tr>
      <td>
        <label> Number of Long-Axis Slices</label>
      </td>
      <td>
      <select id="ns" style="width: 100%">
        <option value="1">1</option>
        <option value="3" selected>3</option>
        <option value="12">12</option>
      </select>
      </td>
    </tr>
    <tr>
      <td>
        <label> Number of Circumferential Slices</label>
      </td>
      <td>
      <select id="nr" style="width: 100%">
        <option value="1">1</option>
        <option value="2">2</option>
        <option value="4" selected>4</option>
      </select> 
      </td>
    </tr>
    <tr>
      <td>
        <label>Thickness (mm)</label>
      </td>
      <td>
        <input type="text" id="d" value=10>
      </td>
    </tr>
    <tr>
      <td>
        <label>Height (mm)</label>
      </td>
      <td>
        <input type="text" id="h" value=20>
      </td>
    </tr>
    <tr>
      <td>
        <label>Long-Axis Length (mm)</label>
      </td>
      <td>
        <input type="text" id="w" value=35>
      </td>
    </tr>
    <tr>
      <td>
        <label for=ShowMeso>Display Mesovarium Plane</label>
      </td>
      <td>
        <input type=checkbox id=ShowMeso checked>
      </td>
    </tr>
    <tr>
      <td>
        <button id="Create">Create</button>
        <a id="DownloadSTL">Download STL</a>
      </td>
      <td>
        <a id="DownloadVTP">Download VTP</a>
      </td>
    </tr>
    <tr>
      <td>
        <div id=ProgressBar class=progress-bar>
          <div id=ProgressBarFiller class=progress-bar-value></div>
        </div>
      </td>
    </tr>
</table>
`;

// ------------------------------------------
// API Call and Rendering
// ------------------------------------------
fullScreenRenderer.addController(controlPanel);
const representationSelector = document.querySelector('.representations');

representationSelector.addEventListener('change', (e) => {
  const newRepValue = Number(e.target.value);
  polyActor.getProperty().setRepresentation(newRepValue);
  renderWindow.render();
});

const showMesoBox = document.getElementById('ShowMeso');

showMesoBox.addEventListener('change', (e) => {
  global.mpActor.setVisibility(e.target.checked);
  renderWindow.render();
})

const btnCreate = document.getElementById('Create');

// prevent resending same request to server
global.crntParameters = [0,0,0,0,0];

btnCreate.addEventListener('click', () => {
  const ns = document.getElementById('ns').value;
  const nr = document.getElementById('nr').value;
  const d = document.getElementById('d').value;
  const h = document.getElementById('h').value;
  const w = document.getElementById('w').value;

  if ( ns === global.crntParameters[0] 
    && nr === global.crntParameters[1]
    && d  === global.crntParameters[2]
    && h  === global.crntParameters[3]
    && w  === global.crntParameters[4])
    return;

  global.crntParameters = [ns, nr, d, h, w];

  const server_url = `http://localhost:3000/index.js?ns=${ns}&nr=${nr}&d=${d}&h=${h}&w=${w}`;

  console.log('-- Starting API Call ----------------------');
  console.log('server_url: ', server_url);
  
  const pgBar = document.getElementById('ProgressBarFiller');
  pgBar.hidden = false;

  vtkHttpDataAccessHelper.fetchBinary(server_url, {
  }).then((zipContent) => {
    const dataAccessHelper = vtkDataAccessHelper.get('zip', {
      zipContent,
      callback: (zip) => {
        renderer.removeAllActors(); // Remove actors previously loaded

        createPlane(w, h, d); // Create a meso plane
        createAxes(w, h, d); // Create axes

        const sceneImporter = vtkHttpSceneLoader.newInstance({
          renderer,
          dataAccessHelper,
        });

        sceneImporter.setUrl('index.json');

        sceneImporter.onReady(() => {
          initializeCamera(renderer.getActiveCamera());
          renderWindow.render();
        });

        pgBar.hidden = true;
      },
    });
  });
});

global.renderer = renderer;
global.renderWindow = renderWindow;
global.labels = [];
global.handles = [];