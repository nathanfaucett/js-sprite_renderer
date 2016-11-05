var mat3 = require("@nathanfaucett/mat3"),
    mat4 = require("@nathanfaucett/mat4"),
    vec2 = require("@nathanfaucett/vec2"),
    vec4 = require("@nathanfaucett/vec4"),
    WebGLContext = require("@nathanfaucett/webgl_context"),
    Geometry = require("@nathanfaucett/geometry"),
    sceneRenderer = require("@nathanfaucett/scene_renderer");


var Renderer = sceneRenderer.Renderer,

    depth = WebGLContext.enums.depth,

    NativeUint16Array = typeof(Uint16Array) !== "undefined" ? Uint16Array : Array,
    NativeFloat32Array = typeof(Float32Array) !== "undefined" ? Float32Array : Array,

    UV = [
        0.0, 0.0,
        0.0, 1.0,
        1.0, 1.0,
        1.0, 0.0
    ],
    POSITION = [-1.0, -1.0, 0.0, -1.0, 1.0, 0.0,
        1.0, 1.0, 0.0,
        1.0, -1.0, 0.0
    ],
    NORMAL = [
        0.0, 0.0, 1.0,
        0.0, 0.0, 1.0,
        0.0, 0.0, 1.0,
        0.0, 0.0, 1.0
    ],
    TANGENT = [
        0.0, 0.0, 0.0, 1.0,
        0.0, 1.0, 0.0, 1.0,
        1.0, 1.0, 0.0, 1.0,
        1.0, 0.0, 0.0, 1.0
    ],
    INDEX = [0, 2, 1, 0, 3, 2],

    SpriteRendererPrototype;

module.exports = SpriteRenderer;


function SpriteRenderer() {
    var _this = this,
        geometry = Geometry.create();

    Renderer.call(this);

    geometry
        .addAttribute("position", 12, 3, NativeFloat32Array, false, POSITION)
        .addAttribute("normal", 12, 3, NativeFloat32Array, false, NORMAL)
        .addAttribute("tangent", 16, 4, NativeFloat32Array, false, TANGENT)
        .addAttribute("uv", 8, 2, NativeFloat32Array, false, UV)
        .addAttribute("uv2", 8, 2, NativeFloat32Array, false, UV)
        .setIndex(new NativeUint16Array(INDEX));

    this.geometry = geometry;
    this.spriteGeometry = null;

    this._previous = null;

    function renderSprite(sprite) {
        return _this.renderSprite(sprite, renderSprite.viewMatrix, renderSprite.projectionMatrix, renderSprite.webglPlugin);
    }
    renderSprite.set = function(viewMatrix, projectionMatrix, webglPlugin) {
        renderSprite.viewMatrix = viewMatrix;
        renderSprite.projectionMatrix = projectionMatrix;
        renderSprite.webglPlugin = webglPlugin;
        return renderSprite;
    };

    this._renderSprite = renderSprite;
}
Renderer.extend(SpriteRenderer, "sprite_renderer.SpriteRenderer", 0);
SpriteRendererPrototype = SpriteRenderer.prototype;

SpriteRendererPrototype.init = function() {
    var webgl = this.sceneRenderer.getPlugin("webgl_plugin.WebGLPlugin");
    this.spriteGeometry = webgl.getGLGeometry(this.geometry);
};

SpriteRendererPrototype.before = function() {
    var context = this.sceneRenderer.getPlugin("webgl_plugin.WebGLPlugin").context;

    this._previous = context.__depthFunc;
    context.setDepthFunc(depth.None);
};

SpriteRendererPrototype.after = function() {
    this.sceneRenderer.getPlugin("webgl_plugin.WebGLPlugin").context.setDepthFunc(this._previous);
};

SpriteRendererPrototype.render = function() {
    var sceneRenderer = this.sceneRenderer,
        webglPlugin = sceneRenderer.getPlugin("webgl_plugin.WebGLPlugin"),

        scene = sceneRenderer.scene,
        spriteMananger = scene.getComponentManager("sprite.Sprite"),

        camera = scene.getComponentManager("camera.Camera").getActive(),
        viewMatrix = camera.getView(),
        projectionMatrix = camera.getProjection();

    spriteMananger.forEach(this._renderSprite.set(viewMatrix, projectionMatrix, webglPlugin));
};

var size = vec2.create(1, 1),
    clipping = vec4.create(0, 0, 1, 1),
    modelView = mat4.create(),
    normalMatrix = mat3.create();
SpriteRendererPrototype.renderSprite = function(sprite, viewMatrix, projectionMatrix, webglPlugin) {
    var context = webglPlugin.context,
        gl = context.gl,

        components = sprite.entity.components,

        spriteMaterial = sprite.material,
        spriteGeometry = this.geometry,

        geometry = webglPlugin.getGLGeometry(spriteGeometry),
        program = webglPlugin.getGLMaterial(spriteMaterial).getProgramFor(sprite),

        glUniforms = program.uniforms,
        glUniformHash = glUniforms.getObject(),

        transform = components["transform.Transform3D"] || components["transform.Transform2D"],

        indexBuffer;

    transform.calculateModelView(viewMatrix, modelView);
    transform.calculateNormalMatrix(modelView, normalMatrix);

    context.setProgram(program);

    vec2.set(size, sprite.width, sprite.height);
    glUniformHash.size.set(size);

    if (glUniformHash.clipping) {
        vec4.set(clipping, sprite.x, sprite.y, sprite.w, sprite.h);
        glUniformHash.clipping.set(clipping);
    }

    webglPlugin.bindMaterial(spriteMaterial);
    webglPlugin.bindUniforms(projectionMatrix, modelView, normalMatrix, spriteMaterial.uniforms, glUniforms);
    webglPlugin.bindAttributes(geometry.buffers.getObject(), geometry.getVertexBuffer(), program.attributes);

    if (spriteMaterial.wireframe !== true) {
        indexBuffer = geometry.getIndexBuffer();
        context.setElementArrayBuffer(indexBuffer);
        gl.drawElements(gl.TRIANGLES, indexBuffer.length, gl.UNSIGNED_SHORT, 0);
    } else {
        indexBuffer = geometry.getLineBuffer();
        context.setElementArrayBuffer(indexBuffer);
        gl.drawElements(gl.LINES, indexBuffer.length, gl.UNSIGNED_SHORT, 0);
    }

    return this;
};