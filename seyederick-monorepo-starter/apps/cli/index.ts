#!/usr/bin/env node
import { orchestrate } from '@seyederick/orchestrator';

const input = process.argv.slice(2).join(" ");
orchestrate(input).then(console.log).catch(console.error);