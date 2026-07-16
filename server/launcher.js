/**
 * AI Shopping Assistant - Launcher
 * Auto-detects ports, starts frontend and backend, opens browser
 */

const { spawn } = require('child_process');
const http = require('http');
const path = require('path');

const DEFAULT_FRONTEND_PORT = 8080;
const DEFAULT_BACKEND_PORT = 3001;
const MAX_PORT_ATTEMPTS = 20;

function findAvailablePort(startPort) {
    return new Promise((resolve, reject) => {
        let port = startPort;
        const tryPort = () => {
            if (port >= startPort + MAX_PORT_ATTEMPTS) {
                reject(new Error(`在 ${startPort} 到 ${port - 1} 之间未找到可用端口`));
                return;
            }
            const testServer = http.createServer();
            testServer.once('error', (err) => {
                if (err.code === 'EADDRINUSE') {
                    port++;
                    tryPort();
                } else {
                    reject(err);
                }
            });
            testServer.once('listening', () => {
                testServer.close(() => resolve(port));
            });
            testServer.listen(port, '127.0.0.1');
        };
        tryPort();
    });
}

function waitForServer(url, timeout = 15000) {
    return new Promise((resolve, reject) => {
        const startTime = Date.now();
        const check = () => {
            if (Date.now() - startTime > timeout) {
                reject(new Error(`等待服务超时: ${url}`));
                return;
            }
            const req = http.get(url, { timeout: 2000 }, (res) => {
                if (res.statusCode >= 200 && res.statusCode < 400) {
                    resolve();
                } else {
                    setTimeout(check, 300);
                }
            });
            req.on('error', () => setTimeout(check, 300));
            req.on('timeout', () => {
                req.destroy();
                setTimeout(check, 300);
            });
        };
        check();
    });
}

function openBrowser(url) {
    const platform = process.platform;
    if (platform === 'win32') {
        spawn('cmd', ['/c', 'start', '', url], { detached: true, stdio: 'ignore' });
    } else if (platform === 'darwin') {
        spawn('open', [url], { detached: true, stdio: 'ignore' });
    } else {
        spawn('xdg-open', [url], { detached: true, stdio: 'ignore' });
    }
}

function startProcess(command, args, env) {
    return spawn(command, args, {
        env: { ...process.env, ...env },
        stdio: 'inherit',
        shell: false
    });
}

async function main() {
    console.log('\n========================================');
    console.log('  AI电商购物助手 - 一键启动脚本');
    console.log('========================================');
    console.log('\n【使用方法】');
    console.log('  1. 双击 .bat 文件运行（推荐）');
    console.log('  2. 脚本会自动检测端口并启动前后端服务');
    console.log('  3. 服务就绪后自动打开浏览器');
    console.log('  4. 按 Ctrl+C 可停止所有服务');
    console.log('\n【环境要求】');
    console.log('  · Node.js 已安装');
    console.log('  · Windows 10/11');
    console.log('========================================\n');

    console.log('\n🔍 正在检测可用端口...\n');

    const [frontendPort, backendPort] = await Promise.all([
        findAvailablePort(DEFAULT_FRONTEND_PORT),
        findAvailablePort(DEFAULT_BACKEND_PORT)
    ]);

    console.log(`✅ 前端服务端口: ${frontendPort}`);
    console.log(`✅ 后端服务端口: ${backendPort}\n`);

    const serverDir = path.join(__dirname);

    console.log('🚀 正在启动后端服务...');
    const backendProc = startProcess('node', [path.join(serverDir, 'backend.js')], { PORT: backendPort.toString() });

    console.log('🚀 正在启动前端服务...');
    const frontendProc = startProcess('node', [path.join(serverDir, 'frontend.js')], { PORT: frontendPort.toString() });

    console.log('⏳ 等待服务就绪...\n');

    try {
        await waitForServer(`http://127.0.0.1:${backendPort}/api/health`);
        console.log('✅ 后端服务已就绪\n');
    } catch (err) {
        console.error('❌ 后端服务启动失败:', err.message);
        backendProc.kill();
        frontendProc.kill();
        process.exit(1);
    }

    try {
        await waitForServer(`http://127.0.0.1:${frontendPort}`);
        console.log('✅ 前端服务已就绪\n');
    } catch (err) {
        console.error('❌ 前端服务启动失败:', err.message);
        backendProc.kill();
        frontendProc.kill();
        process.exit(1);
    }

    const url = `http://127.0.0.1:${frontendPort}`;
    console.log(`🌐 正在打开浏览器: ${url}\n`);
    openBrowser(url);

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('  🛒  AI电商购物助手 启动成功');
    console.log(`  📱  前端地址: http://127.0.0.1:${frontendPort}`);
    console.log(`  🔌  后端地址: http://127.0.0.1:${backendPort}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('\n按 Ctrl+C 停止所有服务\n');

    const cleanup = (signal) => {
        console.log('\n🛑 正在停止服务...');
        backendProc.kill(signal);
        frontendProc.kill(signal);
        setTimeout(() => {
            backendProc.kill('SIGKILL');
            frontendProc.kill('SIGKILL');
            process.exit(0);
        }, 2000);
    };

    process.on('SIGINT', () => cleanup('SIGTERM'));
    process.on('SIGTERM', () => cleanup('SIGTERM'));

    backendProc.on('exit', (code) => {
        if (code !== 0 && code !== null) {
            console.error(`\n⚠️  后端服务异常退出 (代码: ${code})`);
            frontendProc.kill();
            process.exit(1);
        }
    });

    frontendProc.on('exit', (code) => {
        if (code !== 0 && code !== null) {
            console.error(`\n⚠️  前端服务异常退出 (代码: ${code})`);
            backendProc.kill();
            process.exit(1);
        }
    });
}

main().catch(err => {
    console.error('\n❌ 启动失败:', err.message);
    process.exit(1);
});
