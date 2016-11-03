var sceneGraph = require("@nathanfaucett/scene_graph"),
    sceneRenderer = require("@nathanfaucett/scene_renderer"),
    cameraComponent = require("@nathanfaucett/camera_component"),
    transformComponents = require("@nathanfaucett/transform_components"),
    spriteComponent = require("@nathanfaucett/sprite_component"),
    Shader = require("@nathanfaucett/shader"),
    Material = require("@nathanfaucett/material"),
    WebGLPlugin = require("@nathanfaucett/webgl_plugin"),
    SpriteRenderer = require("..");


var Scene = sceneGraph.Scene,
    Entity = sceneGraph.Entity,

    SceneRenderer = sceneRenderer.SceneRenderer,

    Camera = cameraComponent.Camera,
    Sprite = spriteComponent.Sprite,
    Transform3D = transformComponents.Transform3D;


var scene = global.scene = Scene.create(),
    camera = Camera.create(),

    shader = Shader.create({
        name: "shader_simple",
        src: null,
        vertex: [
            "void main(void) {",
            "    gl_Position = perspectiveMatrix * modelViewMatrix * getPosition();",
            "}"
        ].join("\n"),
        fragment: [
            "void main(void) {",
            "    gl_FragColor = vec4(1.0, 0.75, 0.5, 0.5);",
            "}"
        ].join("\n")
    }),

    material = Material.create({
        name: "material_simple",
        src: null,
        shader: shader,
        wireframe: false,
        wireframeLineWidth: 1
    });


camera.set(512, 512);


var cameraTransform = Transform3D.create();

cameraTransform.lookAt([0, 0, 0]);
cameraTransform.setPosition([0, 0, 10]);

scene.addEntity(Entity.create().addComponent(cameraTransform, camera));

var i = 100;
while (i--) {
    spriteTransform = Transform3D.create();
    spriteTransform._localPosition[0] = (-5 + (Math.random() * 10));
    spriteTransform._localPosition[1] = (-5 + (Math.random() * 10));
    spriteTransform._matrixNeedsUpdate = true;
    scene.addEntity(
        Entity.create().addComponent(spriteTransform, Sprite.create({
            material: material
        }))
    );
}

scene.init();

var renderer = SceneRenderer.create(scene),
    webglPlugin = WebGLPlugin.create();

webglPlugin.setCanvas(document.getElementById("canvas"));
renderer.addPlugin(webglPlugin);
renderer.addRenderer(new SpriteRenderer());

renderer.init();

var time = 0;
(function render() {
    time += scene.time.delta;

    cameraTransform._localPosition[2] = 15 + (Math.sin(time) * 10);
    cameraTransform._matrixNeedsUpdate = true;

    scene.update();
    renderer.render();
    setTimeout(render, 16);
}());
