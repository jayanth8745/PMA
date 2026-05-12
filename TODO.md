# TODO - Per-user data separation

- [ ] Add auth helper to derive `user_id` from `Authorization: Bearer <token>` in `backend/server.py`
- [ ] Update all Mongo inserts/reads/updates/deletes in `backend/server.py` to include `user_id`
- [ ] Update `collection_context()` in `backend/server.py` to return only current user's memories
- [ ] Update `backend/api.py` to parse Authorization and scope memories/expenses/conversations by `user_id`
- [ ] Update `backend/api/routes.py` endpoints to be user-scoped
- [ ] Update `backend/services/memory_serivce.py` to accept/filter by `user_id`
- [ ] Update `backend/services/expense_service.py` to accept/filter by `user_id`
- [ ] Run a quick sanity check by starting backend and verifying user A/B separation
