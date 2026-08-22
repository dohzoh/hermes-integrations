# Hermes: poll GitHub app-idea issues every 5 minutes
0  */6 * * *  cd /home/dozo/Sources/hermes-integrations && bash scripts/git-sync.sh  >> logs/git-sync.log 2>&1
15 */3 * * *  cd /home/dozo/Sources/hermes-integrations && bash scripts/bd-sync.sh  >> logs/bd-sync.log 2>&1
30 */4 * * *  cd /home/dozo/Sources/hermes-integrations && bash scripts/dispatch-ready.sh >> logs/dispatch.log 2>&1
# Run the post-pi-agent hook after each dispatch-ready execution (every 5 minutes)
*/5 * * * * cd /home/dozo/Sources/hermes-integrations && bash scripts/post-pi-agent.sh >> /home/dozo/post-pi-agent.log 2>&1
00 */4 * * *  cd /home/dozo/Sources/hermes-integrations && bash scripts/post-pi-agent.sh >> /home/dozo/post-pi-agent.log 2>&1