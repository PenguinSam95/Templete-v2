import { Camera, GameObject, RenderTexture } from 'UnityEngine';
import { Button, Image, RawImage } from 'UnityEngine.UI';
import { ZepetoScriptBehaviour } from 'ZEPETO.Script'
import { VideoResolutions, WorldVideoRecorder } from 'ZEPETO.World';

export default class RecorderManager extends ZepetoScriptBehaviour {

    // WorldVideoRecorder Video UI 
    public startRecordingButton: Button;
    public stopRecordingButton: Button;
    public saveVideoButton: Button;
    public shareVideoButton: Button;
    public createFeedButton: Button;
    public getThumbnailButton: Button;
    public recordPanel: Image;
    public thumbnailImage: RawImage;

    // Recorder Camera 
    public recorderCamera: Camera;

    // Target Texture 
    public targetTexture: RenderTexture;

    // VideoPlayer Object 
    private videoPlayerObject: GameObject;

    Awake() {
        this.videoPlayerObject = new GameObject();
    }

    Start() {
        this.startRecordingButton.onClick.AddListener(() => {
            const camClone = GameObject.Instantiate(
                this.recorderCamera.gameObject,
                this.recorderCamera.transform.position, this.recorderCamera.transform.rotation,
                this.recorderCamera.transform) as GameObject;
            const cam = camClone.GetComponent<Camera>();
            this.recorderCamera.CopyFrom(cam);
            if (false == WorldVideoRecorder.StartRecording(cam, VideoResolutions.W1280xH720, 15)) {
                return;
            }
            this.StartCoroutine(this.CheckRecording());
            this.recordPanel.gameObject.SetActive(false);
            this.stopRecordingButton.gameObject.SetActive(true);
            this.startRecordingButton.gameObject.SetActive(false);
        });

        this.stopRecordingButton.onClick.AddListener(() => {
            if (false == WorldVideoRecorder.IsRecording()) {
                return;
            }
            WorldVideoRecorder.StopRecording();
            this.recordPanel.gameObject.SetActive(true);
            this.stopRecordingButton.gameObject.SetActive(false);
            this.startRecordingButton.gameObject.SetActive(true);
        });

        this.saveVideoButton.onClick.AddListener(() => {
            if (false == WorldVideoRecorder.IsRecording()) {
                WorldVideoRecorder.SaveToCameraRoll(result => { console.log(`${result}`) });
            }
        });

        this.shareVideoButton.onClick.AddListener(() => {
            if (false == WorldVideoRecorder.IsRecording()) {
                WorldVideoRecorder.Share(result => { console.log(`${result}`) });
            }
        });

        this.createFeedButton.onClick.AddListener(() => {
            if (false == WorldVideoRecorder.IsRecording()) {
                WorldVideoRecorder.CreateFeed("나만의 제페토 월드!", result => { console.log(`${result}`) });
            }
        });

        this.getThumbnailButton.onClick.AddListener(() => {
            if (false == WorldVideoRecorder.IsRecording()) {
                this.thumbnailImage.texture = WorldVideoRecorder.GetThumbnail();
            }
        });
    }

    * CheckRecording() {
        while (WorldVideoRecorder.IsRecording()) {
            yield null;
        }
        const videoPlayer = WorldVideoRecorder.AddVideoPlayerComponent(this.videoPlayerObject, this.targetTexture);
        if (videoPlayer == null) {
            return;
        }
        videoPlayer.Play();
    }

}