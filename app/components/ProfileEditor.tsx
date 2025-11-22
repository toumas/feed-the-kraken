import { Camera, CheckCircle2, UserPlus, X } from "lucide-react";
import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
} from "react";
import Webcam from "react-webcam";
import { Avatar } from "./Avatar";

// --- Context ---

interface ProfileEditorContextValue {
  name: string;
  setName: (name: string) => void;
  photo: string | null;
  setPhoto: (photo: string | null) => void;
  showErrors: boolean;
  setShowErrors: (show: boolean) => void;
  onSave: (name: string, photo: string | null) => void;
}

const ProfileEditorContext = createContext<ProfileEditorContextValue | null>(
  null,
);

function useProfileEditor() {
  const context = useContext(ProfileEditorContext);
  if (!context) {
    throw new Error(
      "ProfileEditor compound components must be used within ProfileEditor.Root",
    );
  }
  return context;
}

// --- Components ---

interface ProfileEditorRootProps {
  initialName: string;
  initialPhoto: string | null;
  onSave: (name: string, photo: string | null) => void;
  children: React.ReactNode;
}

function ProfileEditorRoot({
  initialName,
  initialPhoto,
  onSave,
  children,
}: ProfileEditorRootProps) {
  const [name, setName] = useState(initialName);
  const [photo, setPhoto] = useState<string | null>(initialPhoto);
  const [showErrors, setShowErrors] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim().length > 0 && photo) {
      onSave(name.trim(), photo);
    } else {
      setShowErrors(true);
    }
  };

  return (
    <ProfileEditorContext.Provider
      value={{
        name,
        setName,
        photo,
        setPhoto,
        showErrors,
        setShowErrors,
        onSave,
      }}
    >
      <form onSubmit={handleSave} className="space-y-4">
        {children}
      </form>
    </ProfileEditorContext.Provider>
  );
}

function ProfileEditorPhoto() {
  const { photo, setPhoto, showErrors } = useProfileEditor();
  const [cameraOpen, setCameraOpen] = useState(false);
  const webcamRef = useRef<Webcam>(null);

  const capture = useCallback(() => {
    const imageSrc = webcamRef.current?.getScreenshot();
    if (imageSrc) {
      setPhoto(imageSrc);
      setCameraOpen(false);
    }
  }, [setPhoto]);

  return (
    <div className="flex flex-col items-center">
      <div className="flex justify-center">
        {cameraOpen ? (
          <div className="relative w-full max-w-[240px] aspect-square bg-black rounded-2xl overflow-hidden border-2 border-cyan-500 shadow-lg shadow-cyan-900/30">
            <Webcam
              audio={false}
              ref={webcamRef}
              screenshotFormat="image/jpeg"
              videoConstraints={{ facingMode: "user", aspectRatio: 1 }}
              className="w-full h-full object-cover flip-horizontal"
              onUserMediaError={() =>
                alert("Camera access denied. You can continue without a photo.")
              }
            />
            <button
              type="button"
              onClick={capture}
              className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-white p-3 rounded-full shadow-lg hover:scale-110 transition-transform"
              aria-label="Take Photo"
            >
              <div className="w-6 h-6 rounded-full border-2 border-slate-900" />
            </button>
            <button
              type="button"
              onClick={() => setCameraOpen(false)}
              className="absolute top-2 right-2 bg-black/50 text-white p-1 rounded-full"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="relative group">
            <Avatar url={photo} size="xl" />
            <button
              type="button"
              onClick={() => setCameraOpen(true)}
              className="absolute bottom-0 right-0 bg-cyan-600 hover:bg-cyan-500 text-white p-2 rounded-full shadow-lg transition-colors"
              title="Open Camera"
            >
              <Camera className="w-5 h-5" />
            </button>
            {photo && (
              <button
                type="button"
                onClick={() => setPhoto(null)}
                className="absolute -top-1 -left-1 bg-red-900/80 text-white p-1 rounded-full hover:bg-red-700"
                title="Remove Photo"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        )}
      </div>
      {showErrors && !photo && (
        <p className="text-red-400 text-sm text-center animate-in slide-in-from-top-1 mt-2">
          Please take a photo to continue.
        </p>
      )}
    </div>
  );
}

function ProfileEditorName() {
  const { name, setName, showErrors } = useProfileEditor();

  return (
    <div>
      <label htmlFor="display-name" className="sr-only">
        Display Name
      </label>
      <div className="relative">
        <input
          id="display-name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Enter your pirate name..."
          maxLength={20}
          className="w-full bg-slate-950 border border-slate-700 focus:border-cyan-500 rounded-lg pl-4 pr-10 py-3 text-white placeholder:text-slate-600 outline-none transition-colors"
        />
        <UserPlus className="absolute right-3 top-3.5 w-5 h-5 text-slate-600" />
      </div>
      {showErrors && name.trim().length === 0 && (
        <p className="text-red-400 text-sm mt-1 animate-in slide-in-from-top-1">
          Please enter your name.
        </p>
      )}
    </div>
  );
}

function ProfileEditorSubmit() {
  return (
    <button
      type="submit"
      className="w-full py-3 bg-cyan-600 hover:bg-cyan-500 active:bg-cyan-700 text-white rounded-lg font-bold transition-all flex items-center justify-center gap-2"
    >
      <CheckCircle2 className="w-5 h-5" />
      Save Profile
    </button>
  );
}

export const ProfileEditor = {
  Root: ProfileEditorRoot,
  Photo: ProfileEditorPhoto,
  Name: ProfileEditorName,
  Submit: ProfileEditorSubmit,
};
