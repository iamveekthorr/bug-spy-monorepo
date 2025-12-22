import React from 'react';
import { createPortal } from 'react-dom';

interface IModalProps {
  children: React.ReactNode;
  onClose: () => void;
  isOpen: boolean;
}

const Modal = (props: IModalProps) => {
  if (!props.isOpen) return null;

  return createPortal(
    <div
      className="bg-black/50 inset-0 fixed backdrop-blur-xs"
      onClick={props.onClose}
    >
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        {props.children}
      </div>
    </div>,
    document.body,
  );
};

export default Modal;
