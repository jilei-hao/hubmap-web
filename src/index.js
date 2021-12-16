import '@kitware/vtk.js/Rendering/Profiles/Geometry';

import vtkPolyDataReader from '@kitware/vtk.js/IO/Legacy/PolyDataReader';
import vtkFullScreenRenderWindow from '@kitware/vtk.js/Rendering/Misc/FullScreenRenderWindow';

import vtkActor from '@kitware/vtk.js/Rendering/Core/Actor';
import vtkMapper from '@kitware/vtk.js/Rendering/Core/Mapper';
import vtkPolyData from '@kitware/vtk.js/Common/DataModel/PolyData';
import vtkDataArray from '@kitware/vtk.js/Common/Core/DataArray';
import vtkLookupTable from '@kitware/vtk.js/Common/Core/LookupTable';

import {
  ColorMode,
  ScalarMode,
} from '@kitware/vtk.js/Rendering/Core/Mapper/Constants'

import { AttributeTypes } from '@kitware/vtk.js/Common/DataModel/DataSetAttributes/Constants'

// ----------------------------------------------------------------------------
// Standard rendering code setup
// ----------------------------------------------------------------------------

const fullScreenRenderer = vtkFullScreenRenderWindow.newInstance();
const renderer = fullScreenRenderer.getRenderer();
const renderWindow = fullScreenRenderer.getRenderWindow();
const polyMapper = vtkMapper.newInstance();
const polyActor = vtkActor.newInstance();

// ----------------------------------------------------------------------------
// Get input from the server
// ----------------------------------------------------------------------------
const reader = vtkPolyDataReader.newInstance();

// url of the file server, should be in a configuration file
const server_url = 'http://192.168.4.23:3000';
const file_name = 'Ovary.vtk';

// connect the rendering pipeline
polyMapper.setInputConnection(reader.getOutputPort());
polyActor.setMapper(polyMapper);
renderer.addActor(polyActor);

reader.setUrl(`${server_url}/${file_name}`).then(() => {
  
  reader.loadData().then(() => {
    let polyData = reader.getOutputData();
    let pointData = polyData.getPointData();

    // Copy scalar data into color array
    // - vtk.js color rendering by scalar only works for Int32Array
    let pts = polyData.getPoints();
    const clr = new Int32Array(pts.getNumberOfPoints());
    const orig = pointData.getArrayByName('Label').getData();
    for (let i = 0; i < clr.length; ++i) {
      clr[i] = orig[i];
    }

    polyMapper.setScalarRange(0, 16);
    
    pointData.setScalars(
      vtkDataArray.newInstance({
        name: 'color',
        numberOfComponents: 1,
        values: clr,
      })
    )

    console.log('color scalars created');

    // --Debug: export local variable to global scope
    global.polyData = polyData;
    global.pointData = pointData;

    renderer.resetCamera();
    renderWindow.render();
  });
});

renderer.resetCamera();
renderWindow.render();

// -----------------------------------------------------------
// UI control handling
// -----------------------------------------------------------

const controlPanel = `
<table>
  <tr>
    <td>
      <select class="representations" style="width: 100%">
        <option value="0">Points</option>
        <option value="1">Wireframe</option>
        <option value="2" selected>Surface</option>
      </select>
    </td>
  </tr>
</table>
`;

fullScreenRenderer.addController(controlPanel);
const representationSelector = document.querySelector('.representations');

representationSelector.addEventListener('change', (e) => {
  const newRepValue = Number(e.target.value);
  polyActor.getProperty().setRepresentation(newRepValue);
  renderWindow.render();
});


global.reader = reader;
global.renderer = renderer;
global.polyMapper = polyMapper;
global.renderWindow = renderWindow;