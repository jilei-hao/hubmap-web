/*
  ==========================================================
    HuBMAP Web
    v1.0

  ==========================================================
*/

import '@kitware/vtk.js/Rendering/Profiles/Geometry';

import vtkPolyDataReader from '@kitware/vtk.js/IO/Legacy/PolyDataReader';
import vtkFullScreenRenderWindow from '@kitware/vtk.js/Rendering/Misc/FullScreenRenderWindow';
import vtkLabelWidget from '@kitware/vtk.js/Interaction/Widgets/LabelWidget';
import TextAlign from '@kitware/vtk.js/Interaction/Widgets/LabelRepresentation/Constants';
import vtkActor from '@kitware/vtk.js/Rendering/Core/Actor';
import vtkMapper from '@kitware/vtk.js/Rendering/Core/Mapper';
import vtkDataArray from '@kitware/vtk.js/Common/Core/DataArray';
import vtkSTLWriter from '@kitware/vtk.js/IO/Geometry/STLWriter';
import vtkLineSource from '@kitware/vtk.js/Filters/Sources/LineSource';
import vtkWindowedSincPolyDataFilter from '@kitware/vtk.js/Filters/General/WindowedSincPolyDataFilter'
import { Representation } from '@kitware/vtk.js/Rendering/Core/Property/Constants';

// ----------------------------------------------------------------------------
// Standard rendering code setup
// ----------------------------------------------------------------------------

const fullScreenRenderer = vtkFullScreenRenderWindow.newInstance();
const renderer = fullScreenRenderer.getRenderer();
const renderWindow = fullScreenRenderer.getRenderWindow();
const polyMapper = vtkMapper.newInstance();
const polyActor = vtkActor.newInstance();

// ----------------------------------------------------------------------------
// Create Axes
// ----------------------------------------------------------------------------

function createLine(p1, p2) {
  const lineSource = vtkLineSource.newInstance();
  const actor = vtkActor.newInstance();
  const mapper = vtkMapper.newInstance();

  actor.setMapper(mapper);
  actor.getProperty().setEdgeVisibility(true);
  actor.getProperty().setEdgeColor(1, 0, 0);
  actor.getProperty().setRepresentation(Representation.SURFACE);

  lineSource.setPoint1(p1);
  lineSource.setPoint2(p2);

  mapper.setInputConnection(lineSource.getOutputPort());

  renderer.addActor(actor);
  return { lineSource, mapper, actor };
}

// set axes start and end points
const a = 30;
const pSuperior = [0, a, 0];
const pInferior = [0, -a, 0];
const pLateral = [0, 0, -a];
const pMedial = [0, 0, a];
const pAnterior = [-a, 0, 0];
const pPosterior = [a, 0, 0];

// Create an array of 3 axes
const axes = [
  createLine(pInferior, pSuperior),
  createLine(pLateral, pMedial),
  createLine(pAnterior, pPosterior)
];

// Create orientation text
function createLabel(text, position) {
  const widget = vtkLabelWidget.newInstance();
  widget.setInteractor(renderWindow.getInteractor());
  widget.setEnabled(1);
  widget.setDragable(false);
  widget.getWidgetRep().setLabelText(text);
  widget.getWidgetRep().setWorldPosition(position);

  return widget;
}

const lblS = createLabel('S', pSuperior);
const lblI = createLabel('I', pInferior);
const lblL = createLabel('L', pLateral);
const lblM = createLabel('M', pMedial);
const lblA = createLabel('A', pAnterior);
const lblP = createLabel('P', pPosterior);

global.lblS = lblS;



// ----------------------------------------------------------------------------
// Get input from the server
// ----------------------------------------------------------------------------
const reader = vtkPolyDataReader.newInstance();

// url of the file server, should be in a configuration file
//const server_url = 'http://192.168.4.23:3000/index.js?ns=2&nr=4&d=20&h=30&w=40';
//const file_name = 'Ovary.vtk';

// connect the rendering pipeline
const smoothFilter = vtkWindowedSincPolyDataFilter.newInstance({
  nonManifoldSmoothing: 0,
  numberOfIterations: 20,
  passBand: 0.001,
});
smoothFilter.setInputConnection(reader.getOutputPort());

polyMapper.setInputConnection(smoothFilter.getOutputPort());
polyActor.setMapper(polyMapper);
renderer.addActor(polyActor);
renderer.resetCamera();

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
        <label> Number of Sagittal Slices
        </label>
      </td>
      <td>
        <input type="number" id="ns" value=2>
      </td>
    </tr>
    <tr>
      <td>
        <label> Number of Circumferential Slices
        </label>
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
        <label> Anterior-Posterior Distance (mm)
        </label>
      </td>
      <td>
        <input type="text" id="d" value=20>
      </td>
    </tr>
    <tr>
      <td>
        <label> Superior-Inferior Distance (mm)
          
        </label>
      </td>
      <td>
        <input type="text" id="h" value=30>
      </td>
    </tr>
    <tr>
      <td>
        <label> Medial-Lateral Distance (mm)
          
        </label>
      </td>
      <td>
        <input type="text" id="w" value=40>
      </td>
    </tr>
    <tr>
      <td>
        <button id="Create">Create</button>
        <a id="DownloadSTL">Download STL File</a>
      </td>
      <td>
        <a id="DownloadVTK">Download VTK File</a>
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

const btnCreate = document.getElementById('Create');

btnCreate.addEventListener('click', () => {
  const ns = document.getElementById('ns').value;
  const nr = document.getElementById('nr').value;
  const d = document.getElementById('d').value;
  const h = document.getElementById('h').value;
  const w = document.getElementById('w').value;

  const server_url = `http://192.168.4.23:3000/index.js?ns=${ns}&nr=${nr}&d=${d}&h=${h}&w=${w}`;

  console.log('-- Starting API Call ----------------------');
  console.log('server_url: ', server_url);

  reader.setUrl(server_url).then(() => {
    reader.loadData().then(() => {
      console.log('processing server response...');

      // PolyData from reader is already flowing through the pipeline
      // that has been connected previously. Getting polydata here for 
      // color to scalar mapping and rendering
      let polyData = reader.getOutputData();
      let pointData = polyData.getPointData();
  
      // Copy scalar data into color array
      // - vtk.js color rendering by scalar only works for Int32Array
      let pts = polyData.getPoints();
      const clr = new Int32Array(pts.getNumberOfPoints());
      const orig = pointData.getArrayByName('Label').getData();

      let switcher = 1;
      for (let i = 0; i < clr.length; ++i) {
        clr[i] = orig[i];
      }

      pointData.removeArray('Label');

      pointData.setScalars(
        vtkDataArray.newInstance({
          name: 'Label',
          numberOfComponents: 1,
          values: clr,
        })
      )

      let range = pointData.getArrayByName('Label').getRange();
      polyMapper.setScalarRange(range[0], range[1]);
  
      console.log('color scalars created');

      // Add stl file for download
      const linkSTLDownload = document.getElementById('DownloadSTL');
      const fileContent = vtkSTLWriter.writeSTL(polyData);
      
      const stlBlob = new Blob([fileContent], {
        type: 'application/octet-stream',
      });
      
      linkSTLDownload.href = window.URL.createObjectURL(stlBlob, {
        type: 'application/octet-stream',
      });

      linkSTLDownload.download = 'Ovary.stl';

      console.log('stl download link created')

      // Add vtk file for download
      const linkVTKDownload = document.getElementById('DownloadVTK');

      console.log('inner server url', server_url);
      linkVTKDownload.href = server_url;
      linkVTKDownload.download = 'Ovary.vtk';

  
      // --Debug: export local variable to global scope
      global.polyData = polyData;
      global.pointData = pointData;
  
      
      renderWindow.addRenderer(renderer);
      renderer.resetCamera();
      renderWindow.render();

      console.log('-- End of Processing API response ---------');
    });
  });
});


global.reader = reader;
global.renderer = renderer;
global.polyMapper = polyMapper;
global.renderWindow = renderWindow;
global.smoothFilter = smoothFilter;