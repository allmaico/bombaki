/* Pacote do Three.js embutido no jogo (vira a variável global THREE) */
import * as T from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { GTAOPass } from 'three/examples/jsm/postprocessing/GTAOPass.js';
import { SMAAPass } from 'three/examples/jsm/postprocessing/SMAAPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import * as SkeletonUtils from 'three/examples/jsm/utils/SkeletonUtils.js';
window.THREE = Object.assign({}, T, { GLTFLoader, EffectComposer, RenderPass, UnrealBloomPass, OutputPass, GTAOPass, SMAAPass, ShaderPass, SkeletonUtils });
