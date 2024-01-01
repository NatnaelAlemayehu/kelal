'use client'
import React, { useState, useRef } from 'react';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import SyntaxHighlighter from 'react-syntax-highlighter';
import styles from './chat.module.css'; // Adjust the path as necessary
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { storage } from '../utils/firebaseConnect'
import { ref, uploadBytesResumable, getDownloadURL, UploadTaskSnapshot } from "firebase/storage";
import { FirebaseError } from 'firebase/app';
import { PaperClipIcon } from '@heroicons/react/outline';
import { ArrowUpIcon } from '@heroicons/react/outline';
import { StopIcon } from '@heroicons/react/outline';
import { CircularProgressbar } from 'react-circular-progressbar';
import 'react-circular-progressbar/dist/styles.css'; // Import default styles
import Latex from 'react-latex-next';
import 'katex/dist/katex.min.css'


interface Message {
  id: number;
  text?: string;
  imageUrl?: string | undefined | null;
  response?: string;
}


const ChatInterface: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState<string>('');
  const [imagePreview, setImagePreview] = useState<string | undefined | null>(null);
  let fileInputRef = useRef<HTMLInputElement>(null);
  const [finalResult, setFinalResult] = useState<string>('');
  const [uploadedImage, setUploadedImage] = useState<string>('');
  const [textareaHeight, setTextAreaHeight] = useState<string>('auto');
  const [uploadOngoing, setUploadOngoing] = useState<boolean>(false);
  const [requestMade, setRequestMade] = useState<boolean>(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [inputKey, setInputKey] = useState(Date.now());
  
  const handleTextChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {

    setInputText(event.target.value);

    // Reset the height to 'auto' to properly calculate the new height
    event.target.style.height = 'auto';
    // Set the new height based on the scrollHeight
    event.target.style.height = `${event.target.scrollHeight}px`;

    // Update the state for any other logic dependent on the textarea height
    setTextAreaHeight(`${event.target.scrollHeight}px`);
  };

  function formatLatex(inputString: string) {

    // console.log('input is')
    // console.log(inputString)

    // // First replace text within square brackets
    // let result = inputString.replace(/\[([^\]]+)\]/g, (match, p1) => `$${p1}$`);
    // console.log('square removed')
    // console.log(result)

    // // Then replace text within parentheses
    // let newresult = result.replace(/\(([^\)]+)\)/g, (match, p1) => `$${p1}$`);
    // console.log('parenthesis removed')
    // console.log(newresult)

    // console.log('removed the slashes before $')
    // console.log(newresult.replace(/\\\\\$/g, '$'))
    // let final = newresult.replace(/\\\\\$/g, '$')

    // console.log('replace double slash with single slash')
    // let finalsecond = final.replace(/\\\\/g, '\\')
    // console.log(finalsecond)

    // console.log('replace $ after left or right string')
    // let finalthird = finalsecond.replace(/(left|right)\$/g, '$1');
    // console.log(finalthird)
    
    // return finalthird;

    console.log('input is')
    console.log(inputString)
    // Replace \\( with $
    let result = inputString.replace(/\\\(/g, '$');
    // Replace \\) with $
    result = result.replace(/\\\)/g, '$');
    console.log('formatted value is')
    console.log(result)
    return result;
  }



  const uploadtoFirebase = async (file: File) => {
    try {
      setUploadOngoing(true)
      const randomnumber = Math.floor(Math.random() * 100)
      const storageRef = ref(storage, `${file.name}_${randomnumber}`);
      const uploadTask = uploadBytesResumable(storageRef, file);

      uploadTask.on('state_changed',
        (snapshot: UploadTaskSnapshot) => {
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          setUploadProgress(progress);
          if (progress == 100) {
            setUploadOngoing(false)
          }
        },
        (error: FirebaseError) => {
          console.error("Upload failed:", error);
        },
        async () => {
          const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
          setUploadedImage(downloadURL)
        }
      );
    } catch (err) {
      console.log(err);
    }
  }

  const handleSendMessage = async () => {
    setRequestMade(true)
    if (inputText.trim() || imagePreview) {
      const newMessageId = messages.length;
      const newMessage: Message = {
        id: messages.length,
        text: inputText,
        imageUrl: imagePreview,
        response: ''
      };
      setMessages([...messages, newMessage]);

      setImagePreview(null);

      let body = ""
      if (uploadedImage != "") {
        const imageUrl = uploadedImage
        const content = [
          {
            type: "image_url",
            image_url: {
              url: imageUrl,
            },
          },
          {
            type: "text",
            text: inputText
          }
        ]
        body = JSON.stringify({ content })
      } else {
        body = JSON.stringify({ content: inputText })
      }

      setInputText('');
      setTextAreaHeight('auto')
      const res = await fetch("/api/message", {
        method: "POST",
        body: body,
        headers: {
          "Content-Type": "application/json",
        },
      })
      
      setUploadedImage('')
      setInputKey(Date.now());

      if (!res.ok || !res.body) {
        alert("Error sending message")
        return
      }
      const reader = res.body.getReader()

      const decoder = new TextDecoder()
      let result = ''
      while (true) {
        const { value, done } = await reader.read()
        const text = decoder.decode(value)
        result += text
        // Update the message with the new chunk of the response
        setMessages(prevMessages =>
          prevMessages.map(msg =>
            msg.id === newMessageId ? { ...msg, response: result } : msg
          )
        );
        setFinalResult(result)
        if (done) {
          console.log(result)
          break
        }
      }
    }
  };

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
     
      const file = event.target.files[0];
      const fileReader = new FileReader();

      fileReader.onload = async (e) => {
        setImagePreview(e.target?.result as string);
        await uploadtoFirebase(file);
        event.target.value = '';
      };
      fileReader.readAsDataURL(file);
      setTextAreaHeight(previous => {
        let prevHeightNumber = parseFloat(previous.replace('px', ''));
        return prevHeightNumber + 30 + 'px';
      })
     
    }
  };

  const handleRemoveImage = () => {
    setImagePreview(null);
    setTextAreaHeight('auto')
    setUploadedImage('')
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    handleSendMessage();
  };

  return (
    <div className="flex flex-col max-w-full h-screen md:max-w-[50%] mx-auto border border-gray-300 rounded overflow-hidden" style={{ backgroundColor: '#343541' }}>
      <div className={`flex-1 p-2 md:p-5 overflow-y-auto flex flex-col ${!requestMade && 'justify-center items-center'}`}>
        {!requestMade && (<div className="text-white flex flex-col justify-center items-center">
          <p className='font-bold mb-3 text-xl'>
            Kelal AI
          </p>
          <p className='font-bold mb-5'>
            How can I help you today ?
          </p>
          <div className='flex flex-wrap -mx-2 text-sm'>
            <div className='w-full md:w-1/2 px-2 mb-2'>
              <div className='border rounded p-3'>
                <p className='font-bold'>Ask anything with your photo</p>
                <p>Upload a photo and ask anything</p>
              </div>
            </div>
            <div className=' w-full md:w-1/2 px-2 mb-2'>
              <div className='border rounded p-3'>
                <p className='font-bold'>Get code on any language</p>
                <p>Get code for your mobile app or website project</p>
              </div>
            </div>
            <div className='w-full px-2 mb-2 md:w-1/2'>
              <div className='border rounded p-3'>
                <p className='font-bold'>Write essay on anything</p>
                <p>Get your essay done by providing a topic</p>
              </div>
            </div>
            <div className='w-full px-2 md:w-1/2'>
              <div className='border rounded p-3'>
                <p className='font-bold'>Get creative ideas</p>
                <p>Get business ideas and more</p>
              </div>
            </div>
          </div>
        </div>)}
        {messages.map((message) => (
          <div key={message.id} className="p-2 text-sm text-white md:p-2.5 rounded max-w-[90%] md:max-w-[90%] mr-auto break-words mb-1" style={{ backgroundColor: '#343541' }}>
            {message.imageUrl && <img src={message.imageUrl} alt="Uploaded" className="w-full md:w-[50%]" />}
            {message.text && <p>{message.text}</p>}
            {message.response &&
              <div className="p-2 mt-2" style={{ backgroundColor: '#414034' }}>
                {message.response.split(' ')[0] == 'Maths.' || message.response.split(' ')[0] == 'Physics.' ? <Latex>{formatLatex(message.response)}</Latex> : <Markdown
                  remarkPlugins={[remarkGfm]}
                  components={{
                    code({ children, className }) {
                      const match = /language-(\w+)/.exec(className || '');
                      return match ? (
                        <SyntaxHighlighter
                          PreTag="div"
                          language={match[1]}
                          style={vscDarkPlus}
                          wrapLines={true}
                          wrapLongLines={true}
                        >
                          {String(children).replace(/\n$/, '')}
                        </SyntaxHighlighter>
                      ) : (
                        <code className={className}>{children}</code>
                      );
                    },
                    //Custom renderer for text to parse LaTeX
                    // text({ children }) {
                    //   return <Latex>{formatLatex(children.replace(/\\/g, '\\\\'))}</Latex>;
                    // },
                  }}
                >
                  {message.response}
                </Markdown>}           
              </div>
            }

          </div>
        ))}
      </div>
      <div className="relative p-2 md:p-2.5" style={{ backgroundColor: '#343541' }}>
        {imagePreview && (
          <div className="absolute top-3 left-4 border rounded p-0.75 z-30">
            <img src={imagePreview} alt="Preview" className="w-14 h-7 object-cover rounded" />
            <button onClick={handleRemoveImage} className="absolute top-[-0.625rem] right-[-0.625rem] bg-red-500 border-none text-white cursor-pointer p-[0.3125rem] rounded-full text-sm leading-none flex items-center justify-center w-5 h-5">
              ×
            </button>
            <div className={`circular-progress ${uploadOngoing && 'bg-gray-700 border rounded'}`}>
              {uploadProgress < 100 && (
                <CircularProgressbar
                  value={uploadProgress}
                  text={`${Math.round(uploadProgress)}%`}
                  // Customize the styles as needed
                  styles={{
                    path: {
                      // Path color
                      stroke: `rgba(161, 161, 170, ${uploadProgress / 100})`,
                    },
                    trail: {
                      // Empty part of the progress bar
                      stroke: '#fff',
                    },
                    text: {
                      // Text style
                      fill: '#fff',
                      fontSize: '1.5rem',
                    },
                  }}
                />
              )}
            </div>
          </div>
        )}
        <form onSubmit={handleSubmit} className="flex items-end">
          <div className="relative flex-grow flex">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="absolute left-2 bottom-3.5 text-gray-500 hover:text-gray-700 z-20"
            >
              <PaperClipIcon className="h-5 w-5 text-white" />
            </button>
           
            <textarea
              value={inputText}
              onChange={handleTextChange}
              className={`flex-grow text-sm pl-10 pr-10 p-3 ${imagePreview ? 'pt-10' : ''} text-white border border-gray-300 rounded resize-none overflow-hidden relative z-10`}
              placeholder={uploadedImage != '' && inputText == '' ? 'Enter your question about the image' : 'Type your question'}
              rows={1}
              style={{
                height: textareaHeight,
                backgroundColor: '#343541'
              }}
            />

            <input
              key={inputKey}
              type="file"
              ref={fileInputRef}
              onChange={handleImageUpload}
              className="hidden"
            />
          </div>       
          {uploadedImage != '' && inputText != '' || uploadedImage == '' && inputText != '' ?
            <button
              type="submit"
              className="absolute right-5 bottom-5 text-black bg-white hover:bg-gray-100 active:bg-gray-200 transition-colors duration-300 p-1 rounded-full z-20"
            >
              <ArrowUpIcon className="h-3 w-3" />
            </button>
            :
            <button onClick={(e) => { e.preventDefault() }} className="absolute right-5 bottom-5 text-white bg-white-600 hover:bg-white-700 active:bg-white-800 transition-colors duration-300 p-1 rounded-full z-20">
              <StopIcon className="h-4 w-4" />
            </button>
          }
        </form>
      </div>
    </div>
  );

};

export default ChatInterface;
