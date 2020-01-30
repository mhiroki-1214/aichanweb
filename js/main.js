// ↓まずは各jsでどこ使うねんていう宣言
let scene, renderer, camera, mesh, helper;

// 準備出来てないのでfalse
let ready = false;

//ブラウザーサイズを確認。これでアイちゃんの大きさを確定する。
const windowWidth = window.innerWidth;
const windowHeight = window.innerHeight;

//オブジェクト時間。要らないかもしれないけどオシャレなんでつけてる
const clock = new THREE.Clock();


// 外部ファイルとかどこのどれを読み込むの？を指定
// 仮にこのAudioClipをtrueにすると該当したmp3が再生される。
// ていう機構にしたかったけどエラー吐きまくるのでやるなら自己責任で。
const Pmx = "./pmx/musubiai2.0/aichan.pmx";
const MotionObjects = [
  { id: "loop", VmdClip: null, AudioClip: false },
  { id: "kei_voice_009_1", VmdClip: null, AudioClip: false },
  { id: "kei_voice_010_2", VmdClip: null, AudioClip: false },
  // { id: "thinking", VmdClip: null, AudioClip: false },
];

// リログなど開かれたときに処理発生
window.onload = () => {
  Init();

  LoadModeler();

  Render();
}

/*
 * 3つの初期化をする。
 * あと、カメラとライトも
 */
Init = () => {
  scene = new THREE.Scene();

  const ambient = new THREE.AmbientLight(0xeeeeee);
  scene.add(ambient);

  renderer = new THREE.WebGLRenderer({ alpha: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setClearColor(0xcccccc, 0);

  // documentにMMDをセットする
  document.body.appendChild(renderer.domElement);

  //cameraの作成
  camera = new THREE.PerspectiveCamera(40, windowWidth / windowHeight, 1, 1000);
  camera.position.set(0, 17, 24);
}

/*
 * .pmxと.vmdとmp3のロード。
 */
LoadModeler = async () => {
  const loader = new THREE.MMDLoader();

  //PMXのロード
  LoadPMX = () => {
    return new Promise(resolve => {
      loader.load(Pmx, (object) => {
        mesh = object;
        scene.add(mesh);

        resolve(true);
      }, onProgress, onError);
    });
  }

  //VMDのロード
  LoadVMD = (id) => {
    return new Promise(resolve => {
      const path = "./vmd/" + id + ".vmd";
      const val = MotionObjects.findIndex(MotionObject => MotionObject.id == id);

      loader.loadAnimation(path, mesh, (vmd) => {
        vmd.name = id;

        MotionObjects[val].VmdClip = vmd;

        resolve(true);
      }, onProgress, onError);
    });
  }

  //MP3のロード
  LoadAudio = (id) => {
    return new Promise(resolve => {
      const path = "./audio/" + id + ".mp3";
      const val = MotionObjects.findIndex(MotionObject => MotionObject.id == id);

      if (MotionObjects[val].AudioClip) {
        new THREE.AudioLoader().load(path, (buffer) => {
          const listener = new THREE.AudioListener();
          const audio = new THREE.Audio(listener).setBuffer(buffer);
          MotionObjects[val].AudioClip = audio;

          resolve(true);
        }, onProgress, onError);
      } else {
        resolve(false);
      }
    });
  }

  // ローディング中(PMX)
  await LoadPMX();

  // ローディング(VMD)
  await Promise.all(MotionObjects.map(async (MotionObject) => {
    return await LoadVMD(MotionObject.id);
  }));

  // ローディング(MP3)
  await Promise.all(MotionObjects.map(async (MotionObject) => {
    return await LoadAudio(MotionObject.id);
  }));

  //　テクスチャを設置。
  VmdControl("loop", true);
}
// ☝この読み込み順なので最初はボーンを読み込んで、だんだん外見が出来上がっていくのがわかると思います。


/*
 * VMDとMP3を再生
 * 加えて、ループするVMDの確定
 */
VmdControl = (id, loop) => {
  const index = MotionObjects.findIndex(MotionObject => MotionObject.id == id);

  // 仮にIDが一致しなかったで！と言われたら
  if (index === -1) {
    console.log("not Found ID");
    return;
  }

  ready = false;
  helper = new THREE.MMDAnimationHelper({ afterglow: 2.0, resetPhysicsOnLoop: true });

  // 
  helper.add(mesh, {
    animation: MotionObjects[index].VmdClip,
    physics: false
  });

  //MP3再生
  if (MotionObjects[index].AudioClip) {
    MotionObjects[index].AudioClip.play();
  }

  const mixer = helper.objects.get(mesh).mixer;
  //どれループ？を見る
  if (!loop) {
    mixer.existingAction(MotionObjects[index].VmdClip).setLoop(THREE.LoopOnce);
  }

  // ループイベント
  mixer.addEventListener("loop", (event) => {
    console.log("loop");
  });

  // ループ以外のVMDの再生が終わったらループに指定したVMDに戻す
  mixer.addEventListener("finished", (event) => {
    console.log("finished");
    VmdControl("loop", true);
  });

  ready = true;
}



/*
 * PMXかVMDかMP3のロード(コンソールを開いてからリログすると見れます)
 */
onProgress = (xhr) => {
  if (xhr.lengthComputable) {
    const percentComplete = xhr.loaded / xhr.total * 100;
    console.log(Math.round(percentComplete, 2) + '% downloaded');
  }
}

/* 
 * ロードエラーが発生次第、報告。直前に行ったやつの直下にでるのでどこがエラーかわかりやすいようにしてる。
 */
onError = (xhr) => {
  console.log("ERROR");
}

/*
 * アイちゃんの外見を張り付けたりする。
 */
Render = () => {
  requestAnimationFrame(Render);
  renderer.clear();
  renderer.render(scene, camera);

  if (ready) {
    helper.update(clock.getDelta());
  }
}

/*
 *　クリックイベント
 *　switchでまとめてる。
 */
PoseClickEvent = (id) => {
  switch (id) {
    case "pose1":
      VmdControl("loop", true);
      break;

    case "pose2":
      VmdControl("kei_voice_009_1", false);
      break;

    case "pose3":
      VmdControl("kei_voice_010_2", false);
      break;
      
    // case "pose3":
    //   VmdControl("thinking", false);
    //   break;

    default:
      VmdControl("loop", true);
      break;
  }
}
