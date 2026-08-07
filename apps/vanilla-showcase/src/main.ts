import { createApp } from './app';
import './styles.css';

const root = document.querySelector('#root');
if (!root) throw new Error('Showcase root element was not found');
createApp(root as HTMLElement);
