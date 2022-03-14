var renderer, scene, camera, projector;
var cameraControls, effectControl;
var allCubes = [],
  rotationGroup = [];
var clickFace;
var mouseDownCube, mouseUpCube;
var pivot;
var colours = [0x009b48, 0xffffff, 0xb71234, 0xffd500, 0x0046ad, 0xff5800];
var moveHistory = [];
var randomIntervalId, resolveIntervalId;
var nbRandMoves = 0;
var lado = 3.0;
var speed = 500;
var spacing = 0.5;
var lightHolder;

init();
loadScene();
setupGUI();
render();

/**
 * Funcion de inicializacion de motor, escena y camara
 */
function init() {
  // Motor de render
  renderer = new THREE.WebGLRenderer();
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setClearColor(new THREE.Color(0x000000));
  document.getElementById("container").appendChild(renderer.domElement);
  document.title = "Cubo de Rubik";

  // Escena
  scene = new THREE.Scene();

  // Camara
  var aspectRatio = window.innerWidth / window.innerHeight;
  camera = new THREE.PerspectiveCamera(50, aspectRatio, 0.1, 100);
  camera.position.set(-20, 20, 30);

  cameraControls = new THREE.OrbitControls(camera, renderer.domElement);
  cameraControls.target.set(0, 0, 0);
  cameraControls.enableZoom = false;

  //const axesHelper = new THREE.AxesHelper(15);
  //scene.add(axesHelper);
  pivot = new THREE.Object3D();
  window.addEventListener("resize", updateAspectRatio);
  renderer.shadowMap.enabled = true;
  //renderer.shadowMap.soft = true;
}

function mixCube() {
  randomIntervalId = setInterval(randomMove, 2 * speed);
}

function randomMove() {
  if (nbRandMoves == 9) {
    clearInterval(randomIntervalId);
    nbRandMoves = 0;
  } else {
    nbRandMoves++;
  }
  let rotationAxes = ["x", "y", "z"];
  let randomRotationAxis = rotationAxes[Math.floor(Math.random() * 3)];
  let randomCube = allCubes[Math.floor(Math.random() * 12)];
  let randomCubePositions = {
    x: randomCube.position.x,
    y: randomCube.position.y,
    z: randomCube.position.z,
  };
  makeMove(randomRotationAxis, randomCubePositions);
}

function resolveCube() {
  resolveIntervalId = setInterval(resolveMove, 2 * speed);
}

function resolveMove() {
  if (moveHistory.length == 0) {
    clearInterval(resolveIntervalId);
  } else {
    var lastMove = moveHistory.pop();
    makeMove(
      lastMove.rotationAxis,
      (startCube = lastMove.mouseDownCube),
      false,
      false,
      -1
    );
  }
}

function setupGUI() {
  effectControl = {
    color1: colours[0],
    color2: colours[1],
    color3: colours[2],
    color4: colours[3],
    color5: colours[4],
    color6: colours[5],
    mix: function () {
      mixCube();
    },
    resolve: function () {
      resolveCube();
    },
    speed: 5,
  };

  var gui = new dat.GUI();
  var folder = gui.addFolder("Acciones");
  folder.addColor(effectControl, "color1").name("Color 1");
  folder.addColor(effectControl, "color2").name("Color 2");
  folder.addColor(effectControl, "color3").name("Color 3");
  folder.addColor(effectControl, "color4").name("Color 4");
  folder.addColor(effectControl, "color5").name("Color 5");
  folder.addColor(effectControl, "color6").name("Color 6");
  folder.add(effectControl, "mix").name("Mezclar");
  folder.add(effectControl, "resolve").name("Resolver");
  folder.add(effectControl, "speed", 1, 10, 1).name("Velocidad");
  folder.open();
}

/**
 * Devuelve la orientación de la cara del cubo de Rubik donde el jugador
 * ha hecho un click
 * @param {Object} point
 */
function getClickFace(point) {
  if (point.x > 4.5 || point.x < -4.5) {
    clickFace = "x";
  } else if (point.y > 4.5 || point.y < -4.5) {
    clickFace = "y";
  } else if (point.z > 4.5 || point.z < -4.5) {
    clickFace = "z";
  }
  console.log("Face clicked: ", clickFace);
}

/**
 * Crea un cubo con 6 caras. Esta función estará llamaa 27 veces para crear
 * cada cubo del cubo de Rubik.
 * @param {Number} x : posición x del cubo
 * @param {Number} y : posición y del cubo
 * @param {Number} z : posición z del cubo
 */
function crearCubo(x, y, z) {
  geometry = new THREE.CubeGeometry(3, 3, 3);

  var loaderCubo = new THREE.TextureLoader();
  var texCubo = loaderCubo.load("images/wall.jpg");

  material = new THREE.MeshPhongMaterial({
    vertexColors: THREE.FaceColors,
    wireframe: false,
    map: texCubo,
  });

  for (var i = 0; i < 12; i = i + 2) {
    geometry.faces[i].color.setHex(colours[i / 2]);
    geometry.faces[i + 1].color.setHex(colours[i / 2]);
  }

  mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(x, y, z);
  mesh.rubikPosition = mesh.position.clone();
  mesh.castShadow = true;
  mesh.receiveShadow = false;

  allCubes.push(mesh);
  scene.add(mesh);
}

document.addEventListener("mousedown", function (e) {
  mouse_x = (e.clientX / window.innerWidth) * 2 - 1;
  mouse_y = -(e.clientY / window.innerHeight) * 2 + 1;

  var ray = new THREE.Raycaster();
  ray.setFromCamera(new THREE.Vector2(mouse_x, mouse_y), camera);

  var intersects = ray.intersectObjects(scene.children, false);

  if (
    intersects.length > 0 &&
    intersects[0].object.geometry.type == "BoxGeometry"
  ) {
    disableCameraControl();
    mouseDownCube = intersects[0].object.position;
    getClickFace(intersects[0].point);
  }
  render();
});

var transitions = {
  x: { y: "z", z: "y" },
  y: { x: "z", z: "x" },
  z: { x: "y", y: "x" },
};

function getMaxDirection(dragVector) {
  var maxVal = Math.abs(dragVector.x);
  var maxDirection = "x";
  if (Math.abs(dragVector.y) > maxVal) {
    maxDirection = "y";
    maxVal = Math.abs(dragVector.y);
  }
  if (Math.abs(dragVector.z) > maxVal) {
    maxDirection = "z";
    maxVal = Math.abs(dragVector.z);
  }
  return maxDirection;
}

function setRotationGroup(axis, startCube) {
  if (startCube) {
    rotationGroup = [];
    allCubes.forEach(function (cube) {
      if (Math.abs(cube.position[axis] - startCube[axis]) < 0.1) {
        rotationGroup.push(cube);
      }
    });
  }
  if (rotationGroup.length != 9) {
    rotationGroup = [];
  } else {
    pivot.rotation.set(0, 0, 0);
    pivot.updateMatrixWorld();
    scene.add(pivot);
    for (var i in rotationGroup) {
      pivot.add(rotationGroup[i]);
    }
  }
}

var transitions = {
  x: { y: "z", z: "y" },
  y: { x: "z", z: "x" },
  z: { x: "y", y: "x" },
};

function animate(time) {
  requestAnimationFrame(animate);
  TWEEN.update(time);
}

function makeMove(
  rotationAxis,
  startCube,
  face = false,
  save = true,
  direction = 0
) {
  setRotationGroup(rotationAxis, startCube);
  var dir = direction;
  if (dir == 0) {
    dir = 1;
    if (face) {
      if (
        (face == "z" &&
          rotationAxis == "x" &&
          startCube.z > 0 &&
          startCube.y < 0) ||
        (face == "z" &&
          rotationAxis == "x" &&
          startCube.z < 0 &&
          startCube.y > 0) ||
        (face == "z" &&
          rotationAxis == "y" &&
          startCube.z > 0 &&
          startCube.x > 0) ||
        (face == "z" &&
          rotationAxis == "y" &&
          startCube.z < 0 &&
          startCube.x < 0) ||
        (face == "y" &&
          rotationAxis == "x" &&
          startCube.y > 0 &&
          startCube.z > 0) ||
        (face == "y" &&
          rotationAxis == "x" &&
          startCube.y < 0 &&
          startCube.z < 0) ||
        (face == "y" &&
          rotationAxis == "z" &&
          startCube.y > 0 &&
          startCube.x < 0) ||
        (face == "y" &&
          rotationAxis == "z" &&
          startCube.y < 0 &&
          startCube.x > 0) ||
        (face == "x" &&
          rotationAxis == "y" &&
          startCube.x > 0 &&
          startCube.z < 0) ||
        (face == "x" &&
          rotationAxis == "y" &&
          startCube.x < 0 &&
          startCube.z > 0) ||
        (face == "x" &&
          rotationAxis == "z" &&
          startCube.x < 0 &&
          startCube.y < 0) ||
        (face == "x" &&
          rotationAxis == "z" &&
          startCube.x > 0 &&
          startCube.y > 0)
      ) {
        dir *= -1;
      }
    }
  }
  moveCube(rotationAxis, dir);
  if (save) {
    moveHistory.push({
      rotationAxis: rotationAxis,
      mouseDownCube: startCube,
      direction: dir,
    });
  }
  requestAnimationFrame(animate);
  render();
}

function moveCube(rotationAxis, direction) {
  switch (rotationAxis) {
    case "x":
      var tween = new TWEEN.Tween(pivot.rotation)
        .to({ x: (direction * Math.PI) / 2 }, speed)
        .start()
        .onComplete(() => moveComplete("x", direction));
      break;
    case "y":
      var tween = new TWEEN.Tween(pivot.rotation)
        .to({ y: (direction * Math.PI) / 2 }, speed)
        .start()
        .onComplete(() => moveComplete("y", direction));
      break;
    case "z":
      var tween = new TWEEN.Tween(pivot.rotation)
        .to({ z: (direction * Math.PI) / 2 }, speed)
        .start()
        .onComplete(() => moveComplete("z", direction));
      break;
  }
}

document.addEventListener("mouseup", function (e) {
  enableCameraControl();
  mouse_x = (e.clientX / window.innerWidth) * 2 - 1;
  mouse_y = -(e.clientY / window.innerHeight) * 2 + 1;

  var ray = new THREE.Raycaster();
  ray.setFromCamera(new THREE.Vector2(mouse_x, mouse_y), camera);

  var intersects = ray.intersectObjects(scene.children, false);

  if (
    intersects.length > 0 &&
    intersects[0].object.geometry.type == "BoxGeometry"
  ) {
    mouseUpCube = intersects[0].object.position;
    var dragVector = mouseUpCube.clone();
    dragVector.sub(mouseDownCube);
    if (dragVector.length() > lado) {
      var dragVectorDirection = getMaxDirection(dragVector);
      var rotationAxis = transitions[clickFace][dragVectorDirection];
      console.log("Rotation axis: ", rotationAxis);
      makeMove(rotationAxis, mouseDownCube, clickFace);
    }
  }
  render();
});

function moveComplete(axis, direction) {
  isMoving = false;
  scene.remove(pivot);
  pivot.updateMatrixWorld();
  rotationGroup.forEach(function (cube) {
    cube.updateMatrixWorld();
    cube.rubikPosition = cube.position.clone();
    cube.rubikPosition.applyMatrix4(pivot.matrixWorld);
    cube.position.set(
      cube.rubikPosition.x,
      cube.rubikPosition.y,
      cube.rubikPosition.z
    );
    var myAxis = "";
    if (axis == "x") {
      myAxis = new THREE.Vector3(1, 0, 0);
    } else if (axis == "y") {
      myAxis = new THREE.Vector3(0, 1, 0);
    } else {
      myAxis = new THREE.Vector3(0, 0, 1);
    }
    cube.rotateOnWorldAxis(myAxis, (direction * Math.PI) / 2);
    pivot.remove(cube);
    scene.add(cube);
  });
}

function disableCameraControl() {
  cameraControls.enableRotate = false;
}

function enableCameraControl() {
  cameraControls.enableRotate = true;
}

/**
 * Crea el cubo de Rubik con 27 pequeños cubos.
 * @param {Number} lado : lado de los pequeños cubos
 */
function loadScene() {
  var increment = lado + lado * 0.08;
  var positionOffset = (lado - 1) / 2;
  for (var i = 0; i < lado; i++) {
    for (var j = 0; j < lado; j++) {
      for (var k = 0; k < lado; k++) {
        var x = (i - positionOffset) * increment,
          y = (j - positionOffset) * increment,
          z = (k - positionOffset) * increment;

        crearCubo(x, y, z);
      }
    }
  }

  var texSuelo = new THREE.TextureLoader().load("images/lava.jpg");
  texSuelo.repeat.set(200, 200);
  texSuelo.wrapS = texSuelo.wrapT = THREE.MirroredRepeatWrapping;

  var geoSuelo = new THREE.PlaneGeometry(10000, 10000);
  var matSuelo = new THREE.MeshLambertMaterial({
    color: "white",
    wireframe: false,
    map: texSuelo,
  });
  var suelo = new THREE.Mesh(geoSuelo, matSuelo);
  suelo.rotation.x = -Math.PI / 2;
  suelo.position.y = -15;
  suelo.receiveShadow = true;

  var ambientLight = new THREE.AmbientLight(0xffffff, 0.8);

  var spotLight = new THREE.DirectionalLight(0xffffff, 0.9, 100);
  spotLight.position.set(50, 50, 50);
  // spotLight.target.position.set(0, 0, 0);
  // spotLight.angle = Math.PI / 7;
  // spotLight.penumbra = 0.3;
  spotLight.castShadow = true;
  // spotLight.shadow.camera.near = 1;
  // spotLight.shadow.mapSize.width = 512;
  // spotLight.shadow.mapSize.height = 512;

  // spotLight.shadow.camera.left = -200;
  // spotLight.shadow.camera.right = 200;
  // spotLight.shadow.camera.top = 200;
  // spotLight.shadow.camera.bottom = -200;

  spotLight.shadow.mapSize.width = 512; // default
  spotLight.shadow.mapSize.height = 512; // default
  spotLight.shadow.camera.near = 0.5; // default
  spotLight.shadow.camera.far = 700; // default

  //https://discourse.threejs.org/t/solved-fix-light-position-regardless-of-user-controls/1663
  lightHolder = new THREE.Group();
  lightHolder.add(spotLight);

  // const helper = new THREE.CameraHelper(spotLight.shadow.camera);
  // scene.add(helper);

  scene.add(lightHolder);
  scene.add(suelo);
  scene.add(ambientLight);
  //scene.add(spotLight);
}

function updateAspectRatio() {
  renderer.setSize(window.innerWidth, window.innerHeight);
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
}

function update() {
  cameraControls.update();
  colours = [
    effectControl.color1,
    effectControl.color2,
    effectControl.color3,
    effectControl.color4,
    effectControl.color5,
    effectControl.color6,
  ];

  speed = (11 - effectControl.speed) * 100;

  allCubes.forEach(function (cube) {
    for (var i = 0; i < 12; i = i + 2) {
      cube.geometry.faces[i].color.setHex(colours[i / 2]);
      cube.geometry.faces[i + 1].color.setHex(colours[i / 2]);
      cube.geometry.colorsNeedUpdate = true;
    }
  });
  lightHolder.quaternion.copy(camera.quaternion);
}

function render() {
  requestAnimationFrame(render);
  update();
  renderer.render(scene, camera);
}
