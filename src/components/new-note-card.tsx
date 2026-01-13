import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { type ChangeEvent, type FormEvent, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

interface Folder {
	id: string;
	name: string;
}

interface NewNoteCardProps {
	onNoteCreated: (content: string, folderId?: string | null) => void;
	folders?: Folder[];
	open: boolean;
	handleOpen: (open: boolean) => void;
}

export function NewNoteCard({ onNoteCreated, folders, open, handleOpen }: NewNoteCardProps) {
	const [shouldShowOnboarding, setShouldShowOnboarding] = useState(true);
	const [isRecording, setIsRecording] = useState(false);
	const [content, setContent] = useState("");
	const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
	const speechRecognitionRef = useRef<SpeechRecognition | null>(null);
	const isRecordingRef = useRef(false);

	useEffect(() => {
		return () => {
			if (speechRecognitionRef.current) {
				speechRecognitionRef.current.stop();
				speechRecognitionRef.current = null;
			}
		};
	}, []);

	function handleStartEditor() {
		setShouldShowOnboarding(false);
	}

	function handleContentChanged(event: ChangeEvent<HTMLTextAreaElement>) {
		setContent(event.target.value);

		if (event.target.value === "") {
			setShouldShowOnboarding(true);
		}
	}

	function handleSaveNote(event: FormEvent) {
		event.preventDefault();

		if (content === "") return;

		onNoteCreated(content, selectedFolderId);

		setContent("");
		setSelectedFolderId(null);
		setShouldShowOnboarding(true);

		toast.success("Nota criada com sucesso!");
	}

	function handleStartRecording() {
		const isSpeechRecognitionAPIAvailable =
			"SpeechRecognition" in window || "webkitSpeechRecognition" in window;

		if (!isSpeechRecognitionAPIAvailable) {
			toast.error("Seu navegador nao suporta a API de gravacao. Use Chrome ou Edge.");
			return;
		}

		const navigatorWithBrave = navigator as Navigator & {
			brave?: { isBrave?: () => Promise<boolean> };
		};

		navigatorWithBrave.brave
			?.isBrave?.()
			.then((isBrave) => {
				if (isBrave) {
					toast.warning(
						"O Brave pode bloquear a gravacao por voz. Se falhar, teste no Chrome.",
					);
				}
			})
			.catch(() => {});

		setIsRecording(true);
		isRecordingRef.current = true;
		setShouldShowOnboarding(false);

		const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;

		const startRecognition = () => {
			if (speechRecognitionRef.current) {
				speechRecognitionRef.current.stop();
				speechRecognitionRef.current = null;
			}

			speechRecognitionRef.current = new SpeechRecognitionAPI();

			speechRecognitionRef.current.lang = "pt-BR";
			speechRecognitionRef.current.continuous = true;
			speechRecognitionRef.current.maxAlternatives = 1;
			speechRecognitionRef.current.interimResults = true;

			speechRecognitionRef.current.onresult = (event) => {
				const transcription = Array.from(event.results).reduce((text, result) => {
					return text.concat(result[0].transcript);
				}, "");

				setContent(transcription);
			};

			speechRecognitionRef.current.onerror = (event) => {
				console.error(event);
				if (!isRecordingRef.current) {
					setIsRecording(false);
				}
			};

			speechRecognitionRef.current.onend = () => {
				if (!isRecordingRef.current) {
					setIsRecording(false);
					speechRecognitionRef.current = null;
					return;
				}

				setTimeout(() => {
					if (isRecordingRef.current) {
						startRecognition();
					}
				}, 200);
			};

			speechRecognitionRef.current.start();
		};

		startRecognition();
	}

	function handleStopRecording() {
		setIsRecording(false);
		isRecordingRef.current = false;

		if (speechRecognitionRef.current) {
			speechRecognitionRef.current.stop();
			speechRecognitionRef.current = null;
		}
	}

	function handleDialogOpenChange(nextOpen: boolean) {
		if (!nextOpen) {
			handleStopRecording();
			setContent("");
			setSelectedFolderId(null);
			setShouldShowOnboarding(true);
		}

		handleOpen(nextOpen);
	}

	return (
		<Dialog.Root open={open} onOpenChange={handleDialogOpenChange}>
			<Dialog.Trigger className="rounded-md flex flex-col text-left bg-slate-700 p-5 gap-3 outline-none hover:ring-2 hover:ring-slate-600 focus-visible:ring-2 focus-visible:ring-lime-400">
				<span className="text-sm font-medium text-slate-200">Adicionar nota</span>
				<p className="text-sm leading-6 text-slate-400">
					Grave uma nota em áudio que será convertida para texto automaticamente.
				</p>
			</Dialog.Trigger>

			<Dialog.Portal>
				<Dialog.Overlay className="inset-0 fixed bg-black/50" />
				<Dialog.Content className="fixed overflow-hidden inset-0 md:inset-auto md:left-1/2 md:top-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:max-w-[640px] w-full md:h-[60vh] bg-slate-700 md:rounded-md flex flex-col outline-none">
					<Dialog.Close className="absolute right-0 top-0 bg-slate-800 p-1.5 text-slate-400 hover:text-slate-100">
						<X className="size-5" />
					</Dialog.Close>

					<form className="flex-1 flex flex-col">
						<div className="flex flex-1 flex-col gap-3 p-5">
							<span className="text-sm font-medium text-slate-300">Adicionar nota</span>
							{shouldShowOnboarding ? (
								<p className="text-sm leading-6 text-slate-400">
									Comece{" "}
									<button
										type="button"
										onClick={handleStartRecording}
										className="font-medium text-lime-400 hover:underline"
									>
										gravando uma nota
									</button>{" "}
									em áudio ou se preferir{" "}
									<button
										type="button"
										onClick={handleStartEditor}
										className="font-medium text-lime-400 hover:underline"
									>
										utilize apenas texto
									</button>
								</p>
							) : (
								<>
									<textarea
										autoFocus
										className="text-sm leading-6 text-slate-400 bg-transparent resize-none flex-1 outline-none"
										onChange={handleContentChanged}
										value={content}
									/>
									{folders && folders.length > 0 && (
										<div className="mt-2">
											<label className="text-xs text-slate-400 block mb-2">
												Salvar em pasta (opcional):
											</label>
											<select
												value={selectedFolderId || ""}
												onChange={(e) => setSelectedFolderId(e.target.value || null)}
												className="w-full bg-slate-800 text-slate-300 rounded-md p-2 text-sm outline-none focus:ring-2 focus:ring-lime-400"
											>
												<option value="">Notas sem pasta</option>
												{folders.map((folder) => (
													<option key={folder.id} value={folder.id}>
														{folder.name}
													</option>
												))}
											</select>
										</div>
									)}
								</>
							)}
						</div>

						{isRecording ? (
							<button
								type="button"
								onClick={handleStopRecording}
								className="w-full flex items-center justify-center gap-2 bg-slate-900 py-4 text-center text-sm text-slate-300 outline-none font-medium hover:text-slate-100"
							>
								<div className="size-3 rounded-full bg-red-500 animate-pulse" />
								Gravando! (clique p/ interromper)
							</button>
						) : (
							<button
								type="button"
								onClick={handleSaveNote}
								className="w-full bg-lime-400 py-4 text-center text-sm text-lime-950 outline-none font-medium hover:bg-lime-500"
							>
								Salvar nota
							</button>
						)}
					</form>
				</Dialog.Content>
			</Dialog.Portal>
		</Dialog.Root>
	);
}
