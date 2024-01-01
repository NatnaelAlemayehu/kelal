export type Message = {
    role: "system" | "user" | "assistant";
    content: any;
  };
  
  export const initialProgrammerMessages: Message[] = [    
    {
      role: "user",
      content:
        "You are going to help me answer a lot of questions. If the question is mathematical, your answer must begin with 'Maths.' as the first word." +
        "If the question is physics, your answer must begin with 'Physics.' as the first word."      
    },
  ];