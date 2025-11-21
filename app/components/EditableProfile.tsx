import {
  createContext,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
  useContext,
  useState,
} from "react";

interface EditableProfileContextType {
  isEditing: boolean;
  setIsEditing: Dispatch<SetStateAction<boolean>>;
  save: () => void;
}

const EditableProfileContext = createContext<
  EditableProfileContextType | undefined
>(undefined);

function useEditableProfile() {
  const context = useContext(EditableProfileContext);
  if (!context) {
    throw new Error(
      "EditableProfile compound components must be used within an EditableProfile provider",
    );
  }
  return context;
}

interface EditableProfileProps {
  children: ReactNode;
  defaultEditing?: boolean;
  onSave?: () => void;
}

export function EditableProfile({
  children,
  defaultEditing = false,
  onSave,
}: EditableProfileProps) {
  const [isEditing, setIsEditing] = useState(defaultEditing);

  const save = () => {
    onSave?.();
    setIsEditing(false);
  };

  return (
    <EditableProfileContext.Provider value={{ isEditing, setIsEditing, save }}>
      {children}
    </EditableProfileContext.Provider>
  );
}

function Display({ children }: { children: ReactNode }) {
  const { isEditing } = useEditableProfile();
  if (isEditing) return null;
  return <>{children}</>;
}

function Editor({ children }: { children: (save: () => void) => ReactNode }) {
  const { isEditing, save } = useEditableProfile();
  if (!isEditing) return null;
  return <>{children(save)}</>;
}

function EditTrigger({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const { setIsEditing } = useEditableProfile();
  return (
    <button
      onClick={() => setIsEditing(true)}
      type="button"
      className={className}
    >
      {children}
    </button>
  );
}

EditableProfile.Display = Display;
EditableProfile.Editor = Editor;
EditableProfile.EditTrigger = EditTrigger;
