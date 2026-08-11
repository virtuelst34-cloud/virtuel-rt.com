import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

// Home.tsx imports
const homePath = join(root, 'src/pages/Home.tsx');
let home = readFileSync(homePath, 'utf8');
if (!home.includes('WebRtcRemotePanel')) {
  home = home.replace(
    "import MediaBar from '@/components/chat/MediaBar';",
    "import MediaBar from '@/components/chat/MediaBar';\nimport WebRtcRemotePanel from '@/components/chat/WebRtcRemotePanel';\nimport type { RemoteStreamInfo } from '@/lib/webrtcService';",
  );
  writeFileSync(homePath, home);
  console.log('Home.tsx: imports WebRTC ajoutés');
}

// ChatArea QuizPanel render
const chatPath = join(root, 'src/components/chat/ChatArea.tsx');
let chat = readFileSync(chatPath, 'utf8');
if (!chat.includes("currentSalon === 'quiz'")) {
  chat = chat.replace(
    '{hasScene && <ScenePanel salonId={currentSalon || \'\'} members={sceneMembers} micActive={micActive} userMicLevel={micLevel} />}',
    '{hasScene && <ScenePanel salonId={currentSalon || \'\'} members={sceneMembers} micActive={micActive} userMicLevel={micLevel} />}\n          {currentSalon === \'quiz\' && <QuizPanel salonId={currentSalon} />}',
  );
  writeFileSync(chatPath, chat);
  console.log('ChatArea: QuizPanel ajouté');
}

console.log('Patch batch OK');
