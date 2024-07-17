module movement_gaming::role {
    use std::signer;
    use aptos_framework::event::{Self, EventHandle};
    use aptos_framework::account;

    // error codes
    const E_NOT_ADMIN: u64 = 1;
    const E_NOT_COLLECTOR: u64 = 2;
    const E_NOT_PENDING_ADMIN: u64 = 3;

    const ZERO_ADDRESS: address = @0x0;

    struct Role has key {
        admin: address,
        pending_admin: address,
        transfer_admin_events: EventHandle<address>,
        accept_admin_events: EventHandle<address>,
    }

    fun init_module(sender: &signer) {
        let sender_addr = signer::address_of(sender);
        move_to(sender, Role {
            admin: sender_addr,
            pending_admin: ZERO_ADDRESS,
            transfer_admin_events: account::new_event_handle(sender),
            accept_admin_events: account::new_event_handle(sender),
        });
    }

    /// pending admin role check
    fun only_pending_admin(sender: &signer) acquires Role {
        let role = borrow_global<Role>(@movement_gaming);
        let sender_addr = signer::address_of(sender);
        assert!(sender_addr == role.pending_admin, E_NOT_PENDING_ADMIN);
    }

    /// admin role check
    public fun only_admin(sender: &signer) acquires Role {
        let role = borrow_global<Role>(@movement_gaming);
        let sender_addr = signer::address_of(sender);
        assert!(sender_addr == role.admin, E_NOT_ADMIN);
    }

    /// transfer admin, only admin can do this
    /// after transfer, the new admin need to accept the admin role
    public entry fun transfer_admin(sender: &signer, new_admin: address) acquires Role {
        only_admin(sender);
        let role = borrow_global_mut<Role>(@movement_gaming);
        role.pending_admin = new_admin;
        event::emit_event(&mut role.transfer_admin_events, role.pending_admin);
    }

    /// accept admin, only pending admin can do this
    public entry fun accept_admin(sender: &signer) acquires Role {
        only_pending_admin(sender);
        let role = borrow_global_mut<Role>(@movement_gaming);
        role.admin = role.pending_admin;
        role.pending_admin = ZERO_ADDRESS;
        event::emit_event(&mut role.accept_admin_events, role.admin);
    }

    /// get pending admin address
    public fun get_pending_admin(): address acquires Role {
        let role = borrow_global<Role>(@movement_gaming);
        role.pending_admin
    }

    /// get admin address
    public fun get_admin(): address acquires Role {
        let role = borrow_global<Role>(@movement_gaming);
        role.admin
    }

    #[test(deployer = @movement_gaming)]
    fun test_init(deployer: signer) acquires Role {
        init_for_testing(&deployer);
        assert!(get_admin() == signer::address_of(&deployer), 0);
    }

    #[test(deployer = @movement_gaming, admin = @test_admin)]
    fun test_transfer_admin(deployer: signer, admin: signer) acquires Role {
        init_for_testing(&deployer);
        let old_admin = signer::address_of(&deployer);
        let new_admin = signer::address_of(&admin);
        transfer_admin(&deployer, new_admin);
        assert!(get_admin() == old_admin, 0);
        assert!(get_pending_admin() == new_admin, 0);
        accept_admin(&admin);
        assert!(get_admin() == new_admin, 0);
        assert!(get_pending_admin() == ZERO_ADDRESS, 0);
    }

    // test transfer admin by attacker
    #[test(deployer = @movement_gaming, attacker = @test_attacker)]
    #[expected_failure(abort_code = E_NOT_ADMIN)]
    fun test_transfer_admin_by_attacker(deployer: signer, attacker: signer) acquires Role {
        init_for_testing(&deployer);
        transfer_admin(&attacker, @test_admin);
    }

    // test accpet admin by attacker
    #[test(deployer = @movement_gaming, attacker = @test_attacker)]
    #[expected_failure(abort_code = E_NOT_PENDING_ADMIN)]
    fun test_accept_admin_by_attacker(deployer: signer, attacker: signer) acquires Role {
        init_for_testing(&deployer);
        transfer_admin(&deployer, @test_admin);
        accept_admin(&attacker);
    }

    #[test(deployer = @movement_gaming, attacker = @test_attacker)]
    #[expected_failure(abort_code = E_NOT_ADMIN)]
    fun test_only_admin(deployer: signer, attacker: signer) acquires Role {
        init_for_testing(&deployer);
        only_admin(&attacker);
    }

    #[test(deployer = @movement_gaming, attacker = @test_attacker)]
    #[expected_failure(abort_code = E_NOT_PENDING_ADMIN)]
    fun test_only_pending_admin(deployer: signer, attacker: signer) acquires Role {
        init_for_testing(&deployer);
        only_pending_admin(&attacker);
    }

    #[test_only]
    public fun init_for_testing(s: &signer) {
        if (!account::exists_at(signer::address_of(s))) {
            account::create_account_for_test(signer::address_of(s));
        };
        init_module(s)
    }
}