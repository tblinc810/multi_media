.PHONY: start stop restart pkill

start:
	@echo "Starting backend (Django) on 0.0.0.0:8000..."
	@cd src/multi_media/backend && nohup poetry run python manage.py runserver 0.0.0.0:8000 > backend.log 2>&1 &
	@echo "Starting frontend (Vite) on port 5173..."
	@cd src/multi_media/frontend && nohup npm run dev > frontend.log 2>&1 &
	@echo "Services are starting in the background. Check backend.log and frontend.log for output."

stop:
	@echo "Stopping backend and frontend services gracefully..."
	-pkill -f "manage.py runserver"
	-pkill -f "vite"
	@echo "Services stopped."

restart: stop start

pkill:
	@echo "Aggressively killing processes..."
	-pkill -9 -f "manage.py runserver"
	-pkill -9 -f "vite"
	@echo "Processes killed."
