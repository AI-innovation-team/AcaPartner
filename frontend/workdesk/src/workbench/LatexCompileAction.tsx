import {useState} from 'react';
import {ArrowUpRight, Download, Play} from 'lucide-react';
import type {NativeDocument} from '../documents/types';
import {Modal} from './Modal';
import {errorText} from './useManuscript';

type Props = {
  runtime: NativeDocument['adapters']['latex'];
  busy: boolean;
  compile: () => void;
  recheck: () => Promise<boolean | undefined>;
};

function InstallationSteps({platform}: {platform?: string}) {
  if (platform === 'darwin') {
    return <>
      <p>在运行 AcaPartner 的 Mac 上安装 MacTeX。完整安装包的下载量为数 GB。</p>
      <a href="https://tug.org/mactex/mactex-download.html" target="_blank" rel="noreferrer">
        打开 MacTeX 下载页 <ArrowUpRight size={14}/>
      </a>
    </>;
  }
  return <>
    {platform === 'linux' && <>
      <p>如果服务运行在 Ubuntu 或 Debian，请在服务端终端安装 XeLaTeX 和中文排版宏包。</p>
      <pre tabIndex={0}><code>sudo apt install texlive-xetex texlive-lang-chinese texlive-latex-extra</code></pre>
    </>}
    <a href="https://tug.org/texlive/quickinstall.html" target="_blank" rel="noreferrer">
      TeX Live 官方安装说明 <ArrowUpRight size={14}/>
    </a>
  </>;
}

export function LatexCompileAction({runtime, busy, compile, recheck}: Props) {
  const [open, setOpen] = useState(false);
  const [checking, setChecking] = useState(false);
  const [feedback, setFeedback] = useState('');
  const available = runtime.compiler_available;

  async function detect() {
    setChecking(true);
    setFeedback('');
    try {
      if (await recheck() === false) setFeedback('仍未检测到编译器。如果已经安装，请展开“如何指定路径”检查服务配置。');
    } catch (error) {
      setFeedback('检测失败，请重新连接项目服务后重试。' + errorText(error));
    } finally {
      setChecking(false);
    }
  }

  return <>
    <button type="button" className="native-button primary" disabled={busy}
      onClick={available ? compile : () => {setFeedback(''); setOpen(true);}}>
      {available ? <><Play/>保存并编译</> : <><Download/>安装 LaTeX</>}
    </button>
    {open && <Modal title="配置 LaTeX 编译器" close={() => setOpen(false)}>
      <div className="latex-setup">
        {available ? <p role="status">已检测到编译器。返回稿件后，点击“保存并编译”即可生成 PDF。</p> : <>
          <p>生成 PDF 需要服务端的 LaTeX 编译器。使用团队工作台时，请由管理员在服务器上安装一次。</p>
          <InstallationSteps platform={runtime.host_platform}/>
          <details>
            <summary>如何指定路径？</summary>
            <p>在服务配置文件 <code>config.json</code> 的 <code>rendering.latex</code> 填入 XeLaTeX 可执行文件的绝对路径，重启同一工作区的服务后重新检测。</p>
            {runtime.host_platform === 'darwin' && <code>/Library/TeX/texbin/xelatex</code>}
          </details>
          <div role="status" aria-live="polite">{checking ? '正在检测服务端编译器…' : feedback}</div>
        </>}
        <div className="wb-form-actions">
          <button type="button" className={'button ' + (available ? 'primary' : 'quiet')} onClick={() => setOpen(false)}>
            {available ? '返回稿件' : '继续写稿'}
          </button>
          {!available && <button type="button" className="button primary" disabled={checking} onClick={() => void detect()}>重新检测</button>}
        </div>
      </div>
    </Modal>}
  </>;
}
