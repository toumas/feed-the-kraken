import { Camera, CheckCircle2, UserPlus, X } from "lucide-react";
import { useCallback, useRef, useState } from "react";
import Webcam from "react-webcam";
import { Avatar } from "./Avatar";

interface ProfileEditorProps {
  initialName: string;
  initialPhoto: string | null;
  onSave: (name: string, photo: string | null) => void;
}

export function ProfileEditor({
  initialName,
  initialPhoto,
  onSave,
}: ProfileEditorProps) {
  const [name, setName] = useState(initialName);
  const [photo, setPhoto] = useState<string | null>(initialPhoto);
  const [cameraOpen, setCameraOpen] = useState(false);
  const webcamRef = useRef<Webcam>(null);

  const capture = useCallback(() => {
    const imageSrc = webcamRef.current?.getScreenshot();
    if (imageSrc) {
      setPhoto(imageSrc);
      setCameraOpen(false);
    }
  }, []);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim().length > 0) {
      onSave(name.trim(), photo);
    }
  };

  return (
    <form onSubmit={handleSave} className="space-y-4">
      {/* Photo Section */}
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

      {/* Name Input */}
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
      </div>

      <button
        type="submit"
        disabled={name.trim().length === 0}
        className="w-full py-3 bg-cyan-600 disabled:bg-slate-800 disabled:text-slate-600 text-white rounded-lg font-bold transition-all flex items-center justify-center gap-2"
      >
        <CheckCircle2 className="w-5 h-5" />
        Save Profile
      </button>
    </form>
  );
}
